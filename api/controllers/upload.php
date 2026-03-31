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
if (empty($businessId) || !hash_equals(ALLOWED_BUSINESS_ID, $businessId)) {
    jsonResponse(403, ['error' => 'Forbidden']);
}

// Validate slug
$slug = $_POST['slug'] ?? '';
if (empty($slug) || !preg_match('/^[a-z0-9\-]+$/', $slug)) {
    jsonResponse(400, ['error' => 'Invalid or missing slug. Must be lowercase alphanumeric with hyphens.']);
}

// Validate image file
if (empty($_FILES['image'])) {
    jsonResponse(400, ['error' => 'No image file provided']);
}

$validation = validateUploadedImage($_FILES['image']);
if ($validation !== true) {
    jsonResponse(400, ['error' => $validation]);
}

// Process: resize + convert to webp/jpg
$localFiles = processImage($_FILES['image']['tmp_name'], $slug);

try {
    // Upload to DO Spaces
    $cdnUrls = uploadToSpaces($localFiles, $slug);
} finally {
    // Always clean up temp files
    cleanupTempFiles($localFiles);
}

jsonResponse(200, [
    'success' => true,
    'slug'    => $slug,
    'images'  => $cdnUrls,
]);
