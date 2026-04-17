<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60');

$slug = sanitizeSearch($_GET['slug'] ?? '');
if ($slug === '') {
    echo json_encode(['categoryName' => '', 'products' => []]);
    exit;
}

$categories = getCategories();
$categoryId = null;
$categoryName = '';
foreach ($categories as $cat) {
    if (($cat['slug'] ?? '') === $slug) {
        $categoryId = $cat['id'];
        $categoryName = $cat['name'];
        break;
    }
}

if (!$categoryId) {
    echo json_encode(['categoryName' => '', 'products' => []]);
    exit;
}

$results = searchProducts('', [
    'limit'  => 9,
    'sort'   => ['updatedAt:desc'],
    'filter' => 'category = "' . addslashes($categoryId) . '" AND inStock = true',
]);

$products = [];
foreach ($results['hits'] ?? [] as $p) {
    $isDual = ($p['trackingType'] ?? '') === 'dual';
    if ($isDual) {
        $hasCashDiscount = !empty($p['priceKgCash']) && $p['priceKgCash'] < ($p['priceKgRegular'] ?? 0);
    } else {
        $hasCashDiscount = !empty($p['priceCash']) && $p['priceCash'] < ($p['priceRegular'] ?? 0);
    }
    $products[] = [
        'slug'            => $p['slug'] ?? '',
        'name'            => $p['name'] ?? '',
        'brand'           => $p['brand'] ?? '',
        'hasImage'        => !empty($p['hasImage']),
        'imageUpdatedAt'  => $p['imageUpdatedAt'] ?? 0,
        'hasCashDiscount' => $hasCashDiscount,
    ];
}

echo json_encode([
    'categoryName' => $categoryName,
    'products'     => $products,
]);
