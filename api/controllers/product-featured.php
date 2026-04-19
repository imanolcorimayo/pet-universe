<?php
/**
 * Toggle product.featured flag. Thin write — no cache, no fan-out.
 * Meilisearch picks up the change on the next sync.
 */

require_once __DIR__ . '/../includes/FirestoreHandler.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['error' => 'Method not allowed']);
}

checkRateLimit();

$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
if (!hash_equals(API_KEY, $apiKey)) {
    jsonResponse(401, ['error' => 'Unauthorized']);
}

// Accept JSON body or form-encoded — admin fetch will send JSON.
$body = [];
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (stripos($contentType, 'application/json') !== false) {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
} else {
    $body = $_POST;
}

$businessId = $body['businessId'] ?? '';
$productId  = $body['productId']  ?? '';
$featured   = $body['featured']   ?? null;

if (empty($businessId) || !in_array($businessId, ALLOWED_BUSINESS_IDS, true)) {
    jsonResponse(403, ['error' => 'Forbidden']);
}
if (!is_string($productId) || !preg_match('/^[A-Za-z0-9]{10,40}$/', $productId)) {
    jsonResponse(400, ['error' => 'Invalid productId']);
}
if (!is_bool($featured)) {
    jsonResponse(400, ['error' => 'featured must be boolean']);
}

try {
    $firestore = new FirestoreHandler(FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_PROJECT_ID);

    // Enforce business ownership — don't let one business flip another's products
    $existing = $firestore->getDocument('product', $productId);
    if (!$existing) {
        jsonResponse(404, ['error' => 'Product not found']);
    }
    if (($existing['businessId'] ?? '') !== $businessId) {
        jsonResponse(403, ['error' => 'Forbidden']);
    }

    $firestore->patchDocument('product', $productId, [
        'featured'  => $featured,
        'updatedAt' => new DateTimeImmutable('now', new DateTimeZone('UTC')),
    ]);
} catch (Throwable $e) {
    error_log('product-featured error: ' . $e->getMessage());
    jsonResponse(502, ['error' => 'Failed to update product']);
}

jsonResponse(200, ['success' => true, 'productId' => $productId, 'featured' => $featured]);
