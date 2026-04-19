<?php
/**
 * Stock check for checkout: resolves cart slugs against Meilisearch and
 * reports current in-stock status. Items missing from the index (hidden,
 * deleted, or slug renamed) are implicitly flagged as unavailable by
 * their absence from the response map.
 *
 * Caveat: accuracy is bounded by the Firestore→Meilisearch sync cadence.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$raw = $_GET['slugs'] ?? '';
$slugs = array_filter(
    array_map('trim', explode(',', $raw)),
    fn($s) => $s !== '' && preg_match('/^[a-z0-9\-]+$/', $s)
);
$slugs = array_slice(array_values(array_unique($slugs)), 0, 50);

if (empty($slugs)) {
    echo json_encode(['items' => (object)[]]);
    exit;
}

$escaped = array_map(fn($s) => '"' . $s . '"', $slugs);
$filter  = 'slug IN [' . implode(',', $escaped) . ']';

$results = searchProducts('', [
    'limit'  => count($slugs),
    'filter' => $filter,
]);

$items = [];
foreach ($results['hits'] ?? [] as $p) {
    $slug = $p['slug'] ?? '';
    if ($slug === '') continue;
    $items[$slug] = [
        'inStock' => !empty($p['inStock']),
        'name'    => $p['name'] ?? '',
    ];
}

echo json_encode(['items' => empty($items) ? (object)[] : $items]);
