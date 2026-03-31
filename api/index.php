<?php
require_once __DIR__ . '/includes/config.php';

// CORS preflight
corsHeaders();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = rtrim($uri, '/') ?: '/';

$routes = [
    '/upload' => 'upload',
];

try {
    if (isset($routes[$uri])) {
        require __DIR__ . '/controllers/' . $routes[$uri] . '.php';
        exit;
    }

    jsonResponse(404, ['error' => 'Not found']);

} catch (Exception $e) {
    error_log('API error: ' . $e->getMessage());
    jsonResponse(500, ['error' => 'Internal server error']);
}
