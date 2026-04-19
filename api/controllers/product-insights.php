<?php
/**
 * AI-generated retail insights over a pre-computed product-stats payload.
 *
 * The admin POSTs the top N products (already scored/sorted by /product-stats)
 * so this endpoint stays thin: no Firestore lookups, just shape + prompt + cache.
 *
 * Caching: identical (businessId, from, to, productIds) → identical insights.
 * Saves real money — Gemini calls aren't free. 7-day TTL with opportunistic sweep.
 */

require_once __DIR__ . '/../includes/GeminiHandler.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['error' => 'Method not allowed']);
}

checkRateLimit();

$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
if (!hash_equals(API_KEY, $apiKey)) {
    jsonResponse(401, ['error' => 'Unauthorized']);
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$businessId = $body['businessId'] ?? '';
$from       = $body['from']       ?? '';
$to         = $body['to']         ?? '';
$items      = $body['items']      ?? [];

if (empty($businessId) || !in_array($businessId, ALLOWED_BUSINESS_IDS, true)) {
    jsonResponse(403, ['error' => 'Forbidden']);
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
    jsonResponse(400, ['error' => 'Invalid from/to']);
}
if (!is_array($items) || count($items) < 3) {
    jsonResponse(400, ['error' => 'items must be an array with at least 3 products']);
}

// Cap defensively — anything more would just blow up the prompt without helping.
$items = array_slice($items, 0, 100);

// Cache key includes the productIds in order so re-running with a different
// top-N (or different sort) regenerates. Hash keeps the filename short.
$idsForKey = implode(',', array_map(fn($r) => $r['productId'] ?? '', $items));
$cacheKey  = substr(md5($idsForKey), 0, 12);
$cacheDir  = TMP_DIR . '/product-insights';
if (!is_dir($cacheDir)) mkdir($cacheDir, 0755, true);
$cacheFile = $cacheDir . "/{$businessId}-{$from}-{$to}-{$cacheKey}.json";

if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 7 * 86400) {
    header('Content-Type: application/json');
    readfile($cacheFile);
    exit;
}

// Project the items down to fields the model actually needs. Keeps the prompt
// tight and avoids leaking irrelevant identifiers (we explicitly omit productId
// — the model doesn't need it and including it tempted hallucinated SKUs).
$projected = array_map(function ($r) {
    return [
        'name'              => $r['name'] ?? '',
        'brand'             => $r['brand'] ?? '',
        'category'          => $r['categoryName'] ?? '',
        'tracking'          => $r['trackingType'] ?? '',
        'unitsSold'         => (float)($r['unitsSold'] ?? 0),
        'kgSold'            => (float)($r['kgSold'] ?? 0),
        'transactions'      => (int)($r['transactions'] ?? 0),
        'revenue'           => (float)($r['revenue'] ?? 0),
        'grossMargin'       => (float)($r['grossMargin'] ?? 0),
        'daysSinceLastSale' => $r['daysSinceLastSale'] ?? null,
        'currentStock'      => (float)($r['currentStock'] ?? 0),
        'featured'          => !empty($r['featured']),
        'webVisible'        => !empty($r['webVisible']),
        'hasImage'          => !empty($r['hasImage']),
        'score'             => (float)($r['score'] ?? 0),
    ];
}, $items);

$totalRevenue = array_sum(array_column($projected, 'revenue'));
$totalMargin  = array_sum(array_column($projected, 'grossMargin'));
$days         = (new DateTimeImmutable($from))->diff(new DateTimeImmutable($to))->days + 1;

$systemPrompt = <<<TXT
Sos un analista de retail con experiencia en pet shops argentinos. Tu trabajo es leer datos de ventas y entregar insights ACCIONABLES, ESPECÍFICOS y NO genéricos al dueño del negocio.

REGLAS NO NEGOCIABLES:
- Nada de obviedades ("tus mejores productos generan más ingresos"). Si lo podés deducir leyendo una sola fila, no es insight.
- Cada insight debe tener: una afirmación concreta + por qué importa + qué hacer al respecto.
- Citá marcas, categorías y productos POR SU NOMBRE EXACTO tal cual aparecen en los datos. Nunca inventes SKUs ni marcas.
- Buscá patrones cruzados: concentración 80/20, marcas que dominan margen vs volumen, categorías subexplotadas, productos hero sin foto/visibilidad, gaps de catálogo, riesgos de stock.
- Si el dato no está, no lo asumas. No hablar de clientes, devoluciones, estacionalidad o canales que no estén en los datos.
- Tono: español rioplatense, profesional pero directo. Cero relleno corporativo.

CATEGORÍAS DE INSIGHT (elegí la que corresponda):
- "marca": patrón a nivel de marca/proveedor
- "producto": un producto específico que merece acción
- "categoria": dinámicas por categoría de producto o tipo de mascota
- "operacion": stock, fotos, publicación en web, configuración
- "concentracion": riesgo o oportunidad de concentración / diversificación

FORMATO:
- "headline": una frase fuerte (máx 25 palabras) que resuma el estado del negocio según estos datos.
- "insights": entre 6 y 10 items. Si hay menos de 6 patrones reales, devolvé menos. Nunca repitas el mismo patrón con palabras distintas.
- "title": titular telegráfico (máx 12 palabras), idealmente arrancando con la marca/producto en cuestión.
- "body": 1-3 oraciones. Lo más concreto posible. Mencioná números cuando agreguen contexto, no para llenar.
TXT;

$userPrompt = "Top " . count($projected) . " productos del negocio (rankeados por un score compuesto que combina ingresos, margen, recencia y volumen de transacciones).\n"
            . "Período analizado: $from a $to ($days días).\n"
            . "Ingresos totales del top: \$" . number_format($totalRevenue, 0, ',', '.') . ".\n"
            . "Margen bruto total del top (aprox.): \$" . number_format($totalMargin, 0, ',', '.') . ".\n\n"
            . "Notas sobre los campos:\n"
            . "- tracking: 'unit' = bolsa/unidad, 'weight' = a granel en kg, 'dual' = ambos.\n"
            . "- unitsSold y kgSold son separados (un producto dual puede tener ambos).\n"
            . "- grossMargin es aproximado: usa el costo actual de compra, no histórico.\n"
            . "- currentStock está expresado en unidades (para productos por peso, derivado de kg / peso por unidad).\n"
            . "- featured/webVisible/hasImage indican estado en la tienda online.\n\n"
            . "Datos:\n"
            . json_encode($projected, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

$schema = [
    'type' => 'OBJECT',
    'properties' => [
        'headline' => ['type' => 'STRING'],
        'insights' => [
            'type' => 'ARRAY',
            'items' => [
                'type' => 'OBJECT',
                'properties' => [
                    'category' => [
                        'type' => 'STRING',
                        'enum' => ['marca', 'producto', 'categoria', 'operacion', 'concentracion'],
                    ],
                    'title' => ['type' => 'STRING'],
                    'body'  => ['type' => 'STRING'],
                ],
                'required' => ['category', 'title', 'body'],
            ],
        ],
    ],
    'required' => ['headline', 'insights'],
];

try {
    $gemini = new GeminiHandler(GEMINI_API_KEY, GEMINI_MODELS, 60);
    $result = $gemini->generateStructured($systemPrompt, $userPrompt, $schema);
} catch (Throwable $e) {
    error_log('product-insights gemini error: ' . $e->getMessage());
    jsonResponse(502, ['error' => 'No se pudo generar el análisis']);
}

$payload = [
    'headline'     => $result['headline'] ?? '',
    'insights'     => $result['insights'] ?? [],
    'productCount' => count($projected),
    'from'         => $from,
    'to'           => $to,
    'generatedAt'  => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s\Z'),
];

$json = json_encode($payload);
file_put_contents($cacheFile, $json, LOCK_EX);

// Opportunistic sweep — drop entries older than 14 days.
foreach (glob($cacheDir . '/*.json') as $old) {
    if (filemtime($old) < time() - 14 * 86400) @unlink($old);
}

header('Content-Type: application/json');
echo $json;
