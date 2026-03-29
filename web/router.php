<?php
/**
 * PHP built-in server router.
 * Usage: php -S localhost:8080 router.php
 *
 * Serves static files directly, routes everything else to index.php.
 */
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Serve static assets directly
if (preg_match('#^/assets/#', $uri) && is_file(__DIR__ . $uri)) {
    return false;
}

// Serve robots.txt
if ($uri === '/robots.txt' && is_file(__DIR__ . '/robots.txt')) {
    return false;
}

// Route everything else through index.php
require __DIR__ . '/index.php';
