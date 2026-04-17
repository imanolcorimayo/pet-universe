<?php
/**
 * Pet Universe Córdoba — Front Controller
 * All requests route through here.
 */

require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/helpers.php';

// Parse the request URI
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = rtrim($uri, '/') ?: '/';

// Route map
$routes = [
    '/'           => 'home',       // dispatcher → currently renders v2
    '/v1'         => 'home-v1',    // original design (hand-written CSS)
    '/v2'         => 'home-v2',    // Tailwind — "almacén de barrio, editorialized"
    '/v3'         => 'home-v3',    // Tailwind — next variant (cloned from v2)
    '/v4'         => 'home-v4',    // Tailwind — mercado-style, density-first (brand palette)
    '/productos'  => 'productos',
    '/buscar'     => 'buscar',
    '/carrito'    => 'carrito',
    '/checkout'   => 'checkout',
    '/sitemap.xml'=> 'sitemap',
    '/api/category-preview' => 'api-category-preview',
];

try {
    // Check exact routes first
    if (isset($routes[$uri])) {
        require __DIR__ . '/controllers/' . $routes[$uri] . '.php';
        exit;
    }

    // Internal: brand rules (not indexed, obscure path)
    if ($uri === '/internal/brand-rules') {
        require __DIR__ . '/docs/brand-rules.html';
        exit;
    }

    // Internal: serve brand docs assets
    if (preg_match('#^/internal/assets/(.+)$#', $uri, $matches)) {
        $file = __DIR__ . '/docs/assets/' . basename($matches[1]);
        if (is_file($file)) {
            $ext = pathinfo($file, PATHINFO_EXTENSION);
            $types = ['jpeg' => 'image/jpeg', 'jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
            header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
            readfile($file);
            exit;
        }
    }

    // Dynamic routes: /sitemap-{category}.xml
    if (preg_match('#^/sitemap-([a-z0-9\-]+)\.xml$#', $uri, $matches)) {
        $sitemapCategory = $matches[1];
        require __DIR__ . '/controllers/sitemap.php';
        exit;
    }

    // Dynamic routes: /producto/{slug}
    if (preg_match('#^/producto/([a-z0-9\-]+)$#', $uri, $matches)) {
        $slug = $matches[1];
        require __DIR__ . '/controllers/producto.php';
        exit;
    }

    // 404
    http_response_code(404);
    require __DIR__ . '/controllers/404.php';

} catch (Exception $e) {
    // Meilisearch or other service down
    http_response_code(503);
    require __DIR__ . '/controllers/error.php';
}
