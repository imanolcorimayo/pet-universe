<?php

require_once __DIR__ . '/../includes/FirestoreHandler.php';
require_once __DIR__ . '/../includes/GeminiHandler.php';

// Only POST allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['error' => 'Method not allowed']);
}

// Rate limit
checkRateLimit();

// Authenticate
$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
if (!hash_equals(API_KEY, $apiKey)) {
    jsonResponse(401, ['error' => 'Unauthorized']);
}

// Validate business ownership
$businessId = $_POST['businessId'] ?? '';
if (empty($businessId) || !in_array($businessId, ALLOWED_BUSINESS_IDS, true)) {
    jsonResponse(403, ['error' => 'Forbidden']);
}

// Validate image file
if (empty($_FILES['image'])) {
    jsonResponse(400, ['error' => 'No image file provided']);
}

$validation = validateUploadedImage($_FILES['image']);
if ($validation !== true) {
    jsonResponse(400, ['error' => $validation]);
}

// Fetch the full business catalog. Products may be tied to multiple suppliers (or none),
// and an invoice can include items not yet linked to the selected supplier, so we match
// against everything owned by the business instead of filtering by supplierId.
try {
    $firestore = new FirestoreHandler(FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_PROJECT_ID);
    $products = $firestore->queryCollection(
        'product',
        [
            ['field' => 'businessId', 'op' => 'EQUAL', 'value' => $businessId],
        ],
        ['name', 'brand', 'productCode', 'unitType', 'trackingType', 'unitWeight']
    );
} catch (Throwable $e) {
    error_log('Firestore error in scan-invoice: ' . $e->getMessage());
    jsonResponse(502, ['error' => 'Failed to load product catalog']);
}

// Build compact catalog for the prompt — drop empty fields to keep the payload small.
$catalog = array_map(function ($p) {
    $entry = ['id' => $p['__id'], 'name' => $p['name'] ?? ''];
    if (!empty($p['brand']))       $entry['brand']    = $p['brand'];
    if (!empty($p['productCode'])) $entry['code']     = $p['productCode'];
    if (!empty($p['unitType']))    $entry['unitType'] = $p['unitType'];
    $trackingType = $p['trackingType'] ?? 'unit';
    if ($trackingType === 'dual') {
        $entry['trackingType'] = 'dual';
        if (!empty($p['unitWeight'])) $entry['unitWeightKg'] = (float) $p['unitWeight'];
    } elseif ($trackingType === 'weight') {
        $entry['trackingType'] = 'weight';
    }
    return $entry;
}, $products);

// Compress + encode image for Gemini (smaller upload = faster request)
$imagePath = $_FILES['image']['tmp_name'];
try {
    $prepared = prepareImageForAi($imagePath);
    $imageB64 = $prepared['base64'];
    $mimeType = $prepared['mimeType'];
} catch (Throwable $e) {
    error_log('Image prep failed in scan-invoice: ' . $e->getMessage());
    jsonResponse(500, ['error' => 'Failed to process image']);
}

// Build the prompt + response schema
$systemPrompt = "Sos un asistente que extrae datos estructurados de facturas de proveedores "
    . "para una tienda de mascotas en Argentina. Seguí las instrucciones al pie de la letra "
    . "y devolvé siempre JSON válido según el schema pedido.";

$userPrompt = "Analizá esta imagen de una factura/remito de proveedor y extraé CADA línea de producto.\n\n"
    . "Catálogo de productos del negocio (JSON):\n"
    . json_encode($catalog, JSON_UNESCAPED_UNICODE) . "\n\n"
    . "Reglas:\n"
    . "- Matching de productos: los nombres NO van a coincidir exactamente. Hacé matching por SIMILITUD usando:\n"
    . "  1) similitud del nombre (ignorá mayúsculas, acentos, orden de palabras, abreviaturas como \"x\", \"kg\", \"grs\", \"u\")\n"
    . "  2) coincidencia de la marca (muy importante — si la marca difiere claramente, NO es match)\n"
    . "  3) coincidencia del código de producto si aparece en la factura\n"
    . "  4) para productos con `trackingType: \"dual\"`, el peso por unidad en kg (`unitWeightKg`) DEBE coincidir con el peso mencionado en la línea de la factura. Ej: si la factura dice \"Royal Canin Mini Adult 7.5kg\", solo matchea con un producto dual cuyo `unitWeightKg` sea 7.5.\n"
    . "- Devolvé el `productId` EXACTO del catálogo cuando encuentres un match razonable. Si hay varios candidatos con nombre parecido pero pesos distintos (en productos duales), elegí el que coincide en peso. Si no hay ninguno razonable, devolvé null.\n"
    . "- Usá `confidence` (0 a 1) para reflejar qué tan seguro estás del match: 1 = código o nombre+marca+peso coinciden claramente, 0.7 = nombre similar pero con alguna duda, 0.3 = match dudoso, 0 = sin match (productId null).\n"
    . "- IMPORTANTE: devolvé `quantity`, `unitCost`, `additionalCharges` y `total` como STRINGS con el formato EXACTO tal como aparecen en la factura (ej: \"49.350\", \"1.500,50\", \"2\", \"0,75\"). NO los conviertas a número — nosotros los parseamos después.\n"
    . "- `unitCost` es el PRECIO UNITARIO (antes del subtotal de línea). Si la factura muestra columnas de cantidad × unitario = subtotal, usá el valor UNITARIO, NUNCA el subtotal.\n"
    . "- Ignorá filas que NO sean productos: subtotales, IVA, otros impuestos, envío, datos bancarios, descuentos globales, totales generales, leyendas.\n"
    . "- `rawText` es la descripción del ítem tal como aparece en la factura.\n"
    . "- `invoiceNumber`: el número/identificador del comprobante tal como aparece (ej: \"0003-00012345\"). Null si no aparece.\n"
    . "- `invoiceDate`: la fecha de emisión tal como aparece en la factura, sin convertir (ej: \"15/04/2026\"). Null si no aparece.\n"
    . "- `invoiceType`: una sola letra en mayúscula: \"A\" (Responsable Inscripto), \"B\" (RI a Consumidor Final), \"C\" (Consumidor Final / Monotributista), o \"X\" (cualquier otro tipo — remitos, presupuestos, tickets no fiscales). Null si no podés determinarlo.\n"
    . "- `additionalCharges`: suma (como string) de cargos extra NO-producto que aparezcan en la factura (envío, gastos administrativos, recargos). Si no hay, devolvé \"0\".\n"
    . "- `total`: el total impreso de la factura tal como aparece, como string. Null si no hay total impreso.";

$responseSchema = [
    'type' => 'OBJECT',
    'properties' => [
        'invoice' => [
            'type' => 'OBJECT',
            'properties' => [
                'invoiceNumber'     => ['type' => 'STRING', 'nullable' => true],
                'invoiceDate'       => ['type' => 'STRING', 'nullable' => true],
                'invoiceType'       => ['type' => 'STRING', 'nullable' => true, 'enum' => ['A', 'B', 'C', 'X']],
                'additionalCharges' => ['type' => 'STRING'],
                'total'             => ['type' => 'STRING', 'nullable' => true],
            ],
            'required' => ['additionalCharges'],
        ],
        'lines' => [
            'type' => 'ARRAY',
            'items' => [
                'type' => 'OBJECT',
                'properties' => [
                    'productId'  => ['type' => 'STRING', 'nullable' => true],
                    'rawText'    => ['type' => 'STRING'],
                    'quantity'   => ['type' => 'STRING'],
                    'unitCost'   => ['type' => 'STRING'],
                    'confidence' => ['type' => 'NUMBER'],
                ],
                'required' => ['rawText', 'quantity', 'unitCost', 'confidence'],
            ],
        ],
    ],
    'required' => ['invoice', 'lines'],
];

// Call Gemini (with model rotation)
try {
    $gemini = new GeminiHandler(GEMINI_API_KEY, GEMINI_MODELS);
    $extracted = $gemini->generateStructured($systemPrompt, $userPrompt, $responseSchema, $imageB64, $mimeType);
} catch (Throwable $e) {
    error_log('Gemini error in scan-invoice: ' . $e->getMessage());
    jsonResponse(502, ['error' => 'AI extraction failed. Please try again.']);
}

if (!isset($extracted['invoice']) || !isset($extracted['lines'])) {
    error_log('Gemini returned unexpected shape: ' . json_encode($extracted));
    jsonResponse(502, ['error' => 'AI returned unexpected data. Please try again.']);
}

// Normalize AI output: parse locale-aware strings into numbers the client expects.
$rawInvoice = $extracted['invoice'];
$invoice = [
    'invoiceNumber'     => (string) ($rawInvoice['invoiceNumber'] ?? ''),
    'invoiceDate'       => parseInvoiceDate($rawInvoice['invoiceDate'] ?? null),
    'invoiceType'       => in_array(strtoupper((string) ($rawInvoice['invoiceType'] ?? '')), ['A', 'B', 'C', 'X'], true)
        ? strtoupper($rawInvoice['invoiceType'])
        : '',
    'additionalCharges' => parseLocalizedAmount($rawInvoice['additionalCharges'] ?? 0),
    'total'             => parseLocalizedAmount($rawInvoice['total'] ?? 0),
];

$lines = array_map(fn($line) => [
    'productId'  => isset($line['productId']) && $line['productId'] !== '' ? (string) $line['productId'] : null,
    'rawText'    => (string) ($line['rawText'] ?? ''),
    'quantity'   => parseLocalizedAmount($line['quantity'] ?? 0),
    'unitCost'   => parseLocalizedAmount($line['unitCost'] ?? 0),
    'confidence' => (float) ($line['confidence'] ?? 0),
], $extracted['lines']);

// Upload the invoice image to the PENDING prefix. The frontend will call
// /commit-invoice-image on save to move it to the permanent prefix; unsaved
// images are auto-deleted by the DO Spaces lifecycle rule on this prefix.
$slug = 'invoice-' . $businessId . '-' . bin2hex(random_bytes(6));
$imageUrl = '';
try {
    $imageUrl = uploadInvoiceImage($imagePath, $slug);
} catch (Throwable $e) {
    // Non-fatal — extraction already succeeded. Log and continue with empty url.
    error_log('Invoice image upload failed: ' . $e->getMessage());
}

jsonResponse(200, [
    'success'  => true,
    'slug'     => $slug,
    'invoice'  => $invoice,
    'lines'    => $lines,
    'imageUrl' => $imageUrl,
]);
