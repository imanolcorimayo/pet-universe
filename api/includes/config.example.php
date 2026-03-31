<?php

// API authentication
define('API_KEY', 'xxx');
define('ALLOWED_BUSINESS_ID', 'xxx'); // Firebase business document ID

// Rate limiting (per IP)
define('RATE_LIMIT_MAX', 30);       // max requests per window
define('RATE_LIMIT_WINDOW', 3600);  // window in seconds (1 hour)

// DigitalOcean Spaces
define('SPACES_KEY', 'xxx');
define('SPACES_SECRET', 'xxx');
define('SPACES_REGION', 'nyc3');
define('SPACES_BUCKET', 'wiseutils-cdn');
define('SPACES_ENDPOINT', 'https://nyc3.digitaloceanspaces.com');
define('CDN_BASE_URL', 'https://wiseutils-cdn.nyc3.cdn.digitaloceanspaces.com');

// Multi-project prefix (files stored under: {prefix}/products/{slug}-{size}.{ext})
define('SPACES_PROJECT_PREFIX', 'pet-universe');

// Image processing
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_MIME_TYPES', ['image/jpeg', 'image/png', 'image/webp']);
define('IMAGE_SIZES', [
    'sm' => 300,   // product cards
    'md' => 600,   // product detail
    'lg' => 1200,  // OG image / full size
]);
define('JPEG_QUALITY', 82);
define('WEBP_QUALITY', 80);
define('AVIF_QUALITY', 32); // cq-level: lower = better quality (0-63)

// CORS - allowed origins for admin app
define('ALLOWED_ORIGINS', [
    'http://localhost:3000',
]);

// Temp directory for image processing
define('TMP_DIR', __DIR__ . '/../tmp');

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/helpers.php';
