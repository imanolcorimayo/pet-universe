<?php
/**
 * Site configuration, Meilisearch client, and helper functions.
 */

// Site constants
define('SITE_NAME', 'Pet Universe Córdoba');
define('SITE_TAGLINE', 'Tienda de Mascotas');
define('WHATSAPP_NUMBER', '5493517605708');
define('STORE_ADDRESS', 'Luis Agote 1924, Córdoba');
define('STORE_INSTAGRAM', '@petuniverse.cba');
define('STORE_INSTAGRAM_URL', 'https://instagram.com/petuniverse.cba');
define('PRODUCTS_PER_PAGE', 12);

// Meilisearch
define('MEILI_HOST', 'http://localhost:7700');
define('MEILI_API_KEY', 'pu6Ma4FPEb6m2s3ce3pBcHbolyJGaIAg');
define('MEILI_PRODUCTS_INDEX', 'petu_products');
define('MEILI_CATEGORIES_INDEX', 'petu_categories');

require_once __DIR__ . '/../vendor/autoload.php';

use Meilisearch\Client;
use Meilisearch\Contracts\DocumentsQuery;

function getMeiliClient(): Client {
    static $client = null;
    if (!$client) {
        $client = new Client(MEILI_HOST, MEILI_API_KEY);
    }
    return $client;
}

/**
 * Search products in Meilisearch.
 */
function searchProducts(string $query = '', array $options = []): array {
    $index = getMeiliClient()->index(MEILI_PRODUCTS_INDEX);
    return $index->search($query, $options)->toArray();
}

/**
 * Get all active categories.
 */
function getCategories(): array {
    $index = getMeiliClient()->index(MEILI_CATEGORIES_INDEX);
    $query = new DocumentsQuery();
    $query->setLimit(50);
    return $index->getDocuments($query)->toArray()['results'];
}

/**
 * Get a single product by its slug.
 */
function getProductBySlug(string $slug): ?array {
    $safe = addslashes($slug);
    $results = searchProducts('', [
        'filter' => "slug = \"$safe\"",
        'limit' => 1,
    ]);
    return $results['hits'][0] ?? null;
}

/**
 * Format price in Argentine pesos.
 */
function formatPrice(int|float $amount): string {
    return '$' . number_format($amount, 0, ',', '.');
}

/**
 * Sanitize user search input.
 */
function sanitizeSearch(string $input): string {
    return htmlspecialchars(strip_tags(trim(substr($input, 0, 100))), ENT_QUOTES, 'UTF-8');
}

/**
 * Map a category name to an Iconify icon identifier.
 */
function getCategoryIcon(string $categoryName): string {
    $name = mb_strtolower($categoryName);
    $map = [
        'balanceado'     => 'lucide:beef',
        'alimento humedo'=> 'mdi:food-drumstick',
        'alimento'       => 'lucide:beef',
        'snack'          => 'lucide:cookie',
        'accesorio'      => 'lucide:gem',
        'juguete perro'  => 'mdi:teddy-bear',
        'juguete gato'   => 'mdi:cat',
        'juguete'        => 'mdi:teddy-bear',
        'higiene'        => 'lucide:droplets',
        'pulguicida'     => 'lucide:shield',
        'transportadora' => 'lucide:briefcase',
        'otra'           => 'mdi:paw',
    ];

    foreach ($map as $keyword => $icon) {
        if (str_contains($name, $keyword)) return $icon;
    }
    return 'mdi:paw';
}

/**
 * Get the base URL path for asset links.
 */
function asset(string $path): string {
    return '/assets/' . ltrim($path, '/');
}
