<?php
/**
 * Per-product sales statistics for the store-level "featured" tool.
 * Folds sale line items in the given date range into one row per product,
 * joined with current inventory + product metadata.
 *
 * GROSS MARGIN CAVEAT: sales don't record cost-at-sale, so margin is computed
 * using the product's CURRENT lastPurchaseCost. Directionally correct; not a
 * historical accounting margin.
 *
 * Response cached to api/tmp/product-stats-{businessId}-{from}-{to}.json for
 * 24h. Sweep runs opportunistically on each write.
 */

require_once __DIR__ . '/../includes/FirestoreHandler.php';

/**
 * For each value in $values, returns its percentile rank in [0, 1] within
 * the array (0 = lowest, 1 = highest). Ties share the same rank (average of
 * their positions). Empty / single-element arrays return all-zeros.
 */
function percentileRanks(array $values): array {
    $n = count($values);
    if ($n === 0) return [];
    if ($n === 1) return [0.0];

    // Sort positions by value, keeping original index → rank
    $indexed = [];
    foreach ($values as $i => $v) $indexed[] = ['i' => $i, 'v' => (float)$v];
    usort($indexed, fn($a, $b) => $a['v'] <=> $b['v']);

    $ranks = array_fill(0, $n, 0.0);
    $i = 0;
    while ($i < $n) {
        // Group ties so they get the same rank
        $j = $i;
        while ($j + 1 < $n && $indexed[$j + 1]['v'] === $indexed[$i]['v']) $j++;
        $avgPos = ($i + $j) / 2.0;
        $rank   = $n > 1 ? $avgPos / ($n - 1) : 0.0;
        for ($k = $i; $k <= $j; $k++) {
            $ranks[$indexed[$k]['i']] = $rank;
        }
        $i = $j + 1;
    }
    return $ranks;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(405, ['error' => 'Method not allowed']);
}

checkRateLimit();

$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
if (!hash_equals(API_KEY, $apiKey)) {
    jsonResponse(401, ['error' => 'Unauthorized']);
}

$businessId = $_GET['businessId'] ?? '';
if (empty($businessId) || !in_array($businessId, ALLOWED_BUSINESS_IDS, true)) {
    jsonResponse(403, ['error' => 'Forbidden']);
}

$from = $_GET['from'] ?? '';
$to   = $_GET['to']   ?? '';
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
    jsonResponse(400, ['error' => 'Invalid from/to — expected YYYY-MM-DD']);
}
if ($from > $to) {
    jsonResponse(400, ['error' => 'from must be <= to']);
}

// Cache lookup — same business/date range inside 24h reuses the folded result.
$cacheDir = TMP_DIR . '/product-stats';
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}
// v4 suffix: scoring rubric simplified — image/visibility no longer gate the
// score, stock penalty softened from ×0.2 to ×0.5. Bump this whenever the
// response shape or scoring formula changes so stale caches aren't served.
$cacheFile = $cacheDir . "/{$businessId}-{$from}-{$to}-v4.json";
if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 86400) {
    header('Content-Type: application/json');
    readfile($cacheFile);
    exit;
}

$fromDate = new DateTimeImmutable($from . ' 00:00:00', new DateTimeZone('UTC'));
$toDate   = new DateTimeImmutable($to   . ' 23:59:59', new DateTimeZone('UTC'));

try {
    $firestore = new FirestoreHandler(FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_PROJECT_ID);

    // Sales in range (fields limited — we only need products array + createdAt for last-sale tracking)
    $sales = $firestore->queryCollection(
        'sale',
        [
            ['field' => 'businessId', 'op' => 'EQUAL',                 'value' => $businessId],
            ['field' => 'createdAt',  'op' => 'GREATER_THAN_OR_EQUAL', 'value' => $fromDate],
            ['field' => 'createdAt',  'op' => 'LESS_THAN_OR_EQUAL',    'value' => $toDate],
        ],
        ['products', 'createdAt']
    );

    // Full product catalog (active only) — need every active product so we can
    // show "zero sales" rows too (useful for spotting slow movers).
    $products = $firestore->queryCollection(
        'product',
        [
            ['field' => 'businessId', 'op' => 'EQUAL', 'value' => $businessId],
            ['field' => 'isActive',   'op' => 'EQUAL', 'value' => true],
        ],
        ['name', 'brand', 'category', 'featured', 'webVisible', 'hasImage', 'trackingType', 'unitWeight', 'profitMarginPercentage']
    );

    // Category names — useful for the page UI and for the future AI-summary
    // step ("which pet types sell most"). Cheap query, ~tens of docs.
    $categories = $firestore->queryCollection(
        'productCategory',
        [
            ['field' => 'businessId', 'op' => 'EQUAL', 'value' => $businessId],
            ['field' => 'isActive',   'op' => 'EQUAL', 'value' => true],
        ],
        ['name']
    );

    // Inventory singletons
    $inventoryDocs = $firestore->queryCollection(
        'inventory',
        [
            ['field' => 'businessId', 'op' => 'EQUAL', 'value' => $businessId],
            ['field' => 'isActive',   'op' => 'EQUAL', 'value' => true],
        ],
        ['productId', 'unitsInStock', 'totalWeight', 'lastPurchaseCost', 'lastMovementAt']
    );
} catch (Throwable $e) {
    error_log('product-stats firestore error: ' . $e->getMessage());
    jsonResponse(502, ['error' => 'Failed to load data']);
}

// Index categories by id
$categoryNameById = [];
foreach ($categories as $c) {
    $categoryNameById[$c['__id']] = $c['name'] ?? '';
}

// Index inventory by productId
$inventoryByProduct = [];
foreach ($inventoryDocs as $inv) {
    $pid = $inv['productId'] ?? '';
    if ($pid !== '') $inventoryByProduct[$pid] = $inv;
}

// Seed one row per active product (so no-sale products still appear).
$rows = [];
foreach ($products as $p) {
    $pid = $p['__id'];
    $inv = $inventoryByProduct[$pid] ?? [];
    $cost = (float)($inv['lastPurchaseCost'] ?? 0);
    $trackingType = $p['trackingType'] ?? 'unit';
    $unitWeight = (float)($p['unitWeight'] ?? 0);

    // Current stock expressed as "available units" — for weight/dual we
    // derive from totalWeight/unitWeight so the column is comparable across
    // tracking types. Falls back to unitsInStock when unitWeight is missing.
    $currentStock = (float)($inv['unitsInStock'] ?? 0);
    if (($trackingType === 'weight' || $trackingType === 'dual') && $unitWeight > 0) {
        $currentStock = ((float)($inv['totalWeight'] ?? 0)) / $unitWeight;
    }

    $rows[$pid] = [
        'productId'       => $pid,
        'name'            => $p['name'] ?? '',
        'brand'           => $p['brand'] ?? '',
        'categoryName'    => $categoryNameById[$p['category'] ?? ''] ?? '',
        'featured'        => !empty($p['featured']),
        'webVisible'      => !empty($p['webVisible']),
        'hasImage'        => !empty($p['hasImage']),
        'trackingType'    => $trackingType,
        'unitsSold'       => 0.0,   // whole bags/units (unitType === 'unit' lines)
        'kgSold'          => 0.0,   // loose kg (unitType === 'kg' lines)
        'transactions'    => 0,     // number of sale lines including this product
        'revenue'         => 0.0,
        'grossMargin'     => 0.0,   // approximated with current lastPurchaseCost
        'currentStock'    => $currentStock,
        'lastSaleAt'      => null,  // ISO string, filled during fold
        'daysSinceLastSale' => null,
        '_cost'           => $cost,
        '_unitWeight'     => $unitWeight,
    ];
}

// Fold sale line items. Dual-tracking products may have lines in either
// 'unit' (one bag) or 'kg' (loose weight). Cost basis differs between the
// two: per-bag cost is lastPurchaseCost directly; per-kg cost is derived
// as lastPurchaseCost / unitWeight. Conflating them was the bug that
// produced catastrophic negative margins on dual products.
foreach ($sales as $sale) {
    $createdAt = $sale['createdAt'] ?? null;
    $saleLines = $sale['products'] ?? [];
    if (!is_array($saleLines)) continue;

    foreach ($saleLines as $line) {
        if (!is_array($line)) continue;
        $pid = $line['productId'] ?? '';
        if ($pid === '' || !isset($rows[$pid])) continue;

        $qty      = (float)($line['quantity']   ?? 0);
        $total    = (float)($line['totalPrice'] ?? 0);
        $unitType = $line['unitType'] ?? 'unit';

        $cost       = $rows[$pid]['_cost'];
        $unitWeight = $rows[$pid]['_unitWeight'];

        if ($unitType === 'kg') {
            $rows[$pid]['kgSold'] += $qty;
            // Per-kg cost only derivable when the product has a known unitWeight
            $costPerKg = $unitWeight > 0 ? ($cost / $unitWeight) : 0.0;
            $rows[$pid]['grossMargin'] += $total - ($qty * $costPerKg);
        } else {
            $rows[$pid]['unitsSold'] += $qty;
            $rows[$pid]['grossMargin'] += $total - ($qty * $cost);
        }
        $rows[$pid]['transactions'] += 1;
        $rows[$pid]['revenue']      += $total;

        if ($createdAt && (!$rows[$pid]['lastSaleAt'] || $createdAt > $rows[$pid]['lastSaleAt'])) {
            $rows[$pid]['lastSaleAt'] = $createdAt;
        }
    }
}

// Derive daysSinceLastSale
$now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
foreach ($rows as $pid => $row) {
    if ($row['lastSaleAt']) {
        try {
            $last = new DateTimeImmutable($row['lastSaleAt']);
            $rows[$pid]['daysSinceLastSale'] = (int)$now->diff($last)->days;
        } catch (Throwable $_) {
            $rows[$pid]['daysSinceLastSale'] = null;
        }
    }
}

// --- Featured-candidate scoring (v2) ---
//
// Each row gets a 0-100 score = weighted sum of percentile ranks on four
// axes. Rationale:
//   • revenue (35%) — directly measures business value
//   • margin  (25%) — featuring a popular but unprofitable item amplifies loss
//   • recency (20%) — fresh demand is more useful than historic
//   • txns    (20%) — breadth of demand; one bulk buyer ≠ many customers
//
// hasImage and webVisible deliberately do NOT affect the score — the page
// exists to help decide what to publish/photograph next, so penalising those
// states would hide the very products this tool needs to surface.
//
// Stock is the only operational gate: an out-of-stock product still scores
// (you want to see "this empty bestseller needs restocking") but is softly
// demoted so a comparable in-stock candidate ranks above it.
//
// Percentile rank is dataset-relative: changes when you change the date range.
// That's intentional — "best in this window" is the question being answered.

$weights = ['revenue' => 0.35, 'margin' => 0.25, 'recency' => 0.20, 'transactions' => 0.20];
$rowList = array_values($rows);

$revenueRanks      = percentileRanks(array_column($rowList, 'revenue'));
$marginRanks       = percentileRanks(array_column($rowList, 'grossMargin'));
$transactionRanks  = percentileRanks(array_column($rowList, 'transactions'));

$output = [];
foreach ($rowList as $idx => $row) {
    // Recency: 1.0 if sold today, linear decay to 0 at 60 days, 0 if never sold.
    $days = $row['daysSinceLastSale'];
    $recencyRank = $days === null ? 0.0 : max(0.0, 1.0 - ($days / 60.0));

    $weighted = $weights['revenue']      * $revenueRanks[$idx]
              + $weights['margin']       * $marginRanks[$idx]
              + $weights['recency']      * $recencyRank
              + $weights['transactions'] * $transactionRanks[$idx];

    $stockMul = $row['currentStock'] > 0 ? 1.0 : 0.5;

    $score = 100.0 * $weighted * $stockMul;

    $row['revenueRank']      = round($revenueRanks[$idx],     4);
    $row['marginRank']       = round($marginRanks[$idx],      4);
    $row['recencyRank']      = round($recencyRank,            4);
    $row['transactionsRank'] = round($transactionRanks[$idx], 4);
    $row['score']            = round($score, 2);

    unset($row['_cost'], $row['_unitWeight']);
    $output[] = $row;
}

// Sort by score desc so the top of the list is the strongest featured candidates.
usort($output, fn($a, $b) => $b['score'] <=> $a['score']);

$payload = [
    'from'          => $from,
    'to'            => $to,
    'generatedAt'   => $now->format('Y-m-d\TH:i:s\Z'),
    'productCount'  => count($output),
    'saleCount'     => count($sales),
    'scoring'       => [
        'version' => 2,
        'weights' => $weights,
        'gates'   => ['noStock' => 0.5],
    ],
    'items'         => $output,
];

$json = json_encode($payload);
file_put_contents($cacheFile, $json, LOCK_EX);

// Opportunistic sweep: drop cache entries older than 7 days. Cheap, runs
// inline with the cache miss so no cron is needed.
foreach (glob($cacheDir . '/*.json') as $old) {
    if (filemtime($old) < time() - 7 * 86400) @unlink($old);
}

header('Content-Type: application/json');
echo $json;
