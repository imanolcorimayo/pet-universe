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
        ['name', 'brand', 'productCode', 'unitType', 'trackingType', 'unitWeight', 'description', 'subcategory']
    );
} catch (Throwable $e) {
    error_log('Firestore error in scan-invoice: ' . $e->getMessage());
    jsonResponse(502, ['error' => 'Failed to load product catalog']);
}

// Build the catalog used for Pass 2 shortlists. It carries every signal that
// helps disambiguation (weight, description, subcategory) — but the full
// catalog is NEVER sent to the AI. Only per-line shortlists go to Pass 2.
$catalog = array_map(function ($p) {
    $entry = ['id' => $p['__id'], 'name' => $p['name'] ?? ''];
    if (!empty($p['brand']))       $entry['brand']       = $p['brand'];
    if (!empty($p['productCode'])) $entry['code']        = $p['productCode'];
    if (!empty($p['unitType']))    $entry['unitType']    = $p['unitType'];
    if (!empty($p['subcategory'])) $entry['subcategory'] = $p['subcategory'];
    if (!empty($p['description'])) $entry['description'] = $p['description'];
    $entry['trackingType'] = $p['trackingType'] ?? 'unit';
    if (!empty($p['unitWeight'])) $entry['unitWeightKg'] = (float) $p['unitWeight'];
    return $entry;
}, $products);

$brandList = distinctBrands($catalog);

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

$gemini = new GeminiHandler(GEMINI_API_KEY, GEMINI_MODELS);

// ============================================================================
// PASS 1 — extract line items + normalize brand/weight tokens.
// No catalog is sent. Only a closed brand vocabulary so the AI can map the
// brand written on the invoice to a known catalog brand (or null). This
// prevents cross-brand hallucination before the matching phase even starts.
// ============================================================================

$pass1System = "Sos un asistente que extrae datos estructurados de facturas de proveedores "
    . "para una tienda de mascotas en Argentina. Seguí las instrucciones al pie de la letra "
    . "y devolvé siempre JSON válido según el schema pedido.";

$pass1User = "Analizá esta imagen de una factura/remito de proveedor y extraé CADA línea de producto.\n\n"
    . "Marcas conocidas del catálogo (lista CERRADA):\n"
    . json_encode($brandList, JSON_UNESCAPED_UNICODE) . "\n\n"
    . "Para cada línea de producto devolvé:\n"
    . "- `rawText`: la descripción del ítem tal cual aparece en la factura.\n"
    . "- `quantity`: cantidad como STRING, con el formato EXACTO del comprobante (ej: \"5\", \"1,5\"). NO la conviertas a número.\n"
    . "- `unitCost`: precio UNITARIO como STRING, formato EXACTO (ej: \"30.600,00\"). Si la factura muestra cantidad × unitario = subtotal, usá el valor unitario, NUNCA el subtotal.\n"
    . "- `brandMatch`: la marca de la lista de arriba que corresponde a esta línea. Es un FILTRO CERRADO — si la marca escrita en la factura NO aparece en la lista, devolvé null. NO inventes. NO mapees a la 'marca más parecida'. Preferí null antes que un match dudoso.\n"
    . "  - Al comparar contra la lista, IGNORÁ diferencias de mayúsculas, acentos, tildes y cedillas. Ej: 'ENERÇAN' o 'enercán' en la factura se corresponde con 'Enercan' de la lista. 'ROYAL CANÍN' se corresponde con 'Royal Canin'.\n"
    . "- `weightKg`: si el texto de la línea menciona un peso, devolvelo como NÚMERO en kg (ej: \"20 Kg\" → 20, \"500 grs\" → 0.5, \"7,5kg\" → 7.5). null si no hay peso.\n\n"
    . "Encabezado de la factura:\n"
    . "- `invoiceNumber`: el número/identificador del comprobante tal cual aparece (ej: \"0003-00012345\"). null si no aparece.\n"
    . "- `invoiceDate`: la fecha de emisión tal cual aparece, sin convertir (ej: \"15/04/2026\"). null si no aparece.\n"
    . "- `invoiceType`: una sola letra en mayúscula: \"A\" (RI), \"B\" (RI a consumidor final), \"C\" (monotributista / consumidor final), \"X\" (remitos, presupuestos, tickets no fiscales). null si no podés determinarlo.\n"
    . "- `additionalCharges`: suma (como string) de cargos extra NO-producto (envío, recargos, gastos administrativos). \"0\" si no hay.\n"
    . "- `total`: el total impreso de la factura como string. null si no hay total impreso.\n\n"
    . "Importante:\n"
    . "- Ignorá filas que NO sean productos: subtotales, IVA, impuestos, envío, datos bancarios, descuentos globales, totales generales, leyendas.\n"
    . "- Si el mismo producto aparece en dos líneas (una paga y otra promocional/bonificada), DEVOLVÉ LAS DOS líneas por separado — NO las combines. El servidor se encarga de fusionar después.";

$pass1Schema = [
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
                    'rawText'    => ['type' => 'STRING'],
                    'quantity'   => ['type' => 'STRING'],
                    'unitCost'   => ['type' => 'STRING'],
                    'brandMatch' => ['type' => 'STRING', 'nullable' => true],
                    'weightKg'   => ['type' => 'NUMBER', 'nullable' => true],
                ],
                'required' => ['rawText', 'quantity', 'unitCost'],
            ],
        ],
    ],
    'required' => ['invoice', 'lines'],
];

try {
    $extracted = $gemini->generateStructured($pass1System, $pass1User, $pass1Schema, $imageB64, $mimeType);
} catch (Throwable $e) {
    error_log('Gemini Pass 1 error in scan-invoice: ' . $e->getMessage());
    jsonResponse(502, ['error' => 'AI extraction failed. Please try again.']);
}

if (!isset($extracted['invoice']) || !isset($extracted['lines'])) {
    error_log('Gemini Pass 1 returned unexpected shape: ' . json_encode($extracted));
    jsonResponse(502, ['error' => 'AI returned unexpected data. Please try again.']);
}

// ============================================================================
// Server-side prefilter — narrow the catalog to plausible candidates per line
// using hard gates on brand and (when present) weight. An empty shortlist
// means "no match possible" and is surfaced to the user as sin match, rather
// than asking the AI to pick a random product.
// ============================================================================

function filterCandidates(array $catalog, ?string $brandMatch, ?float $weightKg, string $rawText, array $brandList): array {
    // Brand gate. Pass 1 should have identified the brand against the closed
    // list; if it didn't, try a deterministic token match as a safety net.
    $brand = ($brandMatch !== null && $brandMatch !== '') ? $brandMatch : matchBrandInText($rawText, $brandList);
    if ($brand === null || $brand === '') {
        return [];
    }

    $normBrand = normalizeText($brand);
    $filtered = array_values(array_filter(
        $catalog,
        fn($p) => !empty($p['brand']) && normalizeText($p['brand']) === $normBrand
    ));

    // Weight gate: when a weight is visible on the invoice line, prefer
    // products whose weight matches. unit-tracked single-SKU bags often don't
    // populate `unitWeight` (only `dual` tracking requires it), but they
    // typically encode the weight in the product name (e.g. "ENERCAN 20KG").
    // So we look at unitWeightKg first, fall back to parsing the name, and
    // if NEITHER produces a weight we keep the product — we can't disprove
    // the match with no data.
    if ($weightKg !== null && $weightKg > 0) {
        $filtered = array_values(array_filter($filtered, function ($p) use ($weightKg) {
            $pw = $p['unitWeightKg'] ?? null;
            if ($pw === null) {
                $pw = extractWeightKg((string) ($p['name'] ?? ''));
            }
            if ($pw === null) return true;
            return abs((float) $pw - $weightKg) < 0.1;
        }));
    }

    return $filtered;
}

$unresolvedForPass2 = []; // Lines with 2+ candidates — need AI to pick
$lineResults = [];        // Final line shape in output order

foreach ($extracted['lines'] as $idx => $rawLine) {
    $rawText    = (string) ($rawLine['rawText'] ?? '');
    $brandMatch = isset($rawLine['brandMatch']) && $rawLine['brandMatch'] !== '' ? (string) $rawLine['brandMatch'] : null;
    $weightKg   = isset($rawLine['weightKg']) && is_numeric($rawLine['weightKg']) ? (float) $rawLine['weightKg'] : null;

    $candidates = filterCandidates($catalog, $brandMatch, $weightKg, $rawText, $brandList);

    $lineResults[$idx] = [
        'rawText'    => $rawText,
        'quantity'   => parseLocalizedAmount($rawLine['quantity'] ?? 0),
        'unitCost'   => parseLocalizedAmount($rawLine['unitCost'] ?? 0),
        'productId'  => null,
        'confidence' => 0.0,
    ];

    $count = count($candidates);
    if ($count === 0) {
        continue; // Deterministic null — no catalog brand matches.
    }
    if ($count === 1) {
        $lineResults[$idx]['productId']  = $candidates[0]['id'];
        $lineResults[$idx]['confidence'] = 1.0;
        continue;
    }
    $unresolvedForPass2[] = [
        'idx'        => $idx,
        'rawText'    => $rawText,
        'candidates' => $candidates,
    ];
}

// ============================================================================
// PASS 2 — only for lines with 2+ candidates. Feeds the image + each line's
// shortlist + strict pick-from-shortlist-or-null rules. The server then
// validates that the returned productId is actually in the shortlist.
// ============================================================================

if (!empty($unresolvedForPass2)) {
    $shortlistFields = ['id', 'name', 'brand', 'code', 'unitType', 'trackingType', 'unitWeightKg', 'description', 'subcategory'];
    $pass2Lines = array_map(fn($u) => [
        'lineIndex'  => $u['idx'],
        'rawText'    => $u['rawText'],
        'candidates' => array_map(
            fn($c) => array_intersect_key($c, array_flip($shortlistFields)),
            $u['candidates']
        ),
    ], $unresolvedForPass2);

    $pass2User = "Ya extrajimos las líneas de la factura. Para CADA línea abajo hay un shortlist de productos candidatos del catálogo. Mirá la imagen original de nuevo y elegí el producto correcto de cada shortlist.\n\n"
        . "Líneas con shortlist:\n"
        . json_encode($pass2Lines, JSON_UNESCAPED_UNICODE) . "\n\n"
        . "Reglas:\n"
        . "- Devolvé `productId` EXACTAMENTE uno del `candidates` de esa línea, o null.\n"
        . "- NUNCA inventes un id. NUNCA uses un id que no esté en el shortlist.\n"
        . "- Si ningún candidato es razonable, devolvé productId: null.\n"
        . "- Cuando los candidatos difieren en peso/tamaño/variedad, priorizá el que coincide con lo que dice la línea en la imagen.\n"
        . "- `confidence`: 1 = claramente ese producto, 0.7 = muy probable, 0.3 = dudoso, 0 = sin match.\n"
        . "- `lineIndex` tiene que coincidir con el `lineIndex` de entrada.";

    $pass2Schema = [
        'type' => 'OBJECT',
        'properties' => [
            'matches' => [
                'type' => 'ARRAY',
                'items' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'lineIndex'  => ['type' => 'NUMBER'],
                        'productId'  => ['type' => 'STRING', 'nullable' => true],
                        'confidence' => ['type' => 'NUMBER'],
                    ],
                    'required' => ['lineIndex', 'confidence'],
                ],
            ],
        ],
        'required' => ['matches'],
    ];

    $pass2 = null;
    try {
        $pass2 = $gemini->generateStructured($pass1System, $pass2User, $pass2Schema, $imageB64, $mimeType);
    } catch (Throwable $e) {
        // Non-fatal: unresolved lines just stay as productId: null.
        error_log('Gemini Pass 2 error in scan-invoice: ' . $e->getMessage());
    }

    // Build per-line shortlist id sets so we can reject any off-shortlist id
    // the model might produce despite the instructions.
    $shortlistIdsByLine = [];
    foreach ($unresolvedForPass2 as $u) {
        $shortlistIdsByLine[$u['idx']] = array_flip(array_map(fn($c) => $c['id'], $u['candidates']));
    }

    foreach (($pass2['matches'] ?? []) as $m) {
        $idx = (int) ($m['lineIndex'] ?? -1);
        if (!isset($lineResults[$idx])) continue;

        $productId  = isset($m['productId']) && $m['productId'] !== '' ? (string) $m['productId'] : null;
        $confidence = is_numeric($m['confidence'] ?? null) ? (float) $m['confidence'] : 0.0;

        if ($productId !== null && !isset($shortlistIdsByLine[$idx][$productId])) {
            error_log("scan-invoice Pass 2 returned off-shortlist productId for line $idx: $productId");
            $productId = null;
            $confidence = 0.0;
        }

        $lineResults[$idx]['productId']  = $productId;
        $lineResults[$idx]['confidence'] = $confidence;
    }
}

// --- Normalize invoice header ---
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

// Reassemble lines in original extraction order.
ksort($lineResults);
$lines = array_values($lineResults);

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
