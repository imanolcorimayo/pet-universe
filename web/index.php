<?php
/**
 * Pet Universe Córdoba — Front Controller
 * All requests route through here.
 */

require_once __DIR__ . '/includes/config.php';

// Parse the request URI
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = rtrim($uri, '/') ?: '/';

// Route map
$routes = [
    '/'           => 'home',
    '/productos'  => 'productos',
    '/buscar'     => 'buscar',
    '/carrito'    => 'carrito',
    '/checkout'   => 'checkout',
    // '/sitemap.xml'=> 'sitemap',  // disabled until production domain
];

try {
    // Check exact routes first
    if (isset($routes[$uri])) {
        require __DIR__ . '/controllers/' . $routes[$uri] . '.php';
        exit;
    }

    // Dynamic routes: /sitemap-{category}.xml (disabled until production domain)
    // if (preg_match('#^/sitemap-([a-z0-9\-]+)\.xml$#', $uri, $matches)) {
    //     $sitemapCategory = $matches[1];
    //     require __DIR__ . '/controllers/sitemap.php';
    //     exit;
    // }

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
