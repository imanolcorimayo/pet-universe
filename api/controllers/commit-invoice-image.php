<?php

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

// Validate slug format and ownership — slug was emitted as "invoice-{businessId}-{hex}"
$slug = trim($_POST['slug'] ?? '');
if ($slug === '' || !preg_match('/^invoice-[A-Za-z0-9_-]+-[a-f0-9]{12}$/', $slug)) {
    jsonResponse(400, ['error' => 'Invalid or missing slug']);
}

$expectedPrefix = 'invoice-' . $businessId . '-';
if (strpos($slug, $expectedPrefix) !== 0) {
    jsonResponse(403, ['error' => 'Slug does not belong to business']);
}

try {
    $committedUrl = commitInvoiceImage($slug);
} catch (Throwable $e) {
    error_log('commit-invoice-image failed: ' . $e->getMessage());
    jsonResponse(502, ['error' => 'Failed to commit invoice image']);
}

if ($committedUrl === '') {
    jsonResponse(404, ['error' => 'No pending image found for this slug']);
}

jsonResponse(200, [
    'success'  => true,
    'imageUrl' => $committedUrl,
]);
