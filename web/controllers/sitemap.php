<?php
header('Content-Type: application/xml; charset=utf-8');

$baseUrl = 'http://petuniverse.local'; // Change for production

// If $sitemapCategory is set, render a category sitemap. Otherwise, render the index.
if (!empty($sitemapCategory)) {
    renderCategorySitemap($baseUrl, $sitemapCategory);
} else {
    renderSitemapIndex($baseUrl);
}

/**
 * Main sitemap index: links to static pages + one child sitemap per category.
 */
function renderSitemapIndex(string $baseUrl): void {
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    echo '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

    // General sitemap (static pages)
    echo '  <sitemap>' . "\n";
    echo '    <loc>' . htmlspecialchars($baseUrl . '/sitemap-general.xml') . '</loc>' . "\n";
    echo '  </sitemap>' . "\n";

    try {
        $categories = getCategories();
        foreach ($categories as $cat) {
            $slug = $cat['slug'] ?? '';
            if (!$slug) continue;
            echo '  <sitemap>' . "\n";
            echo '    <loc>' . htmlspecialchars($baseUrl . '/sitemap-' . $slug . '.xml') . '</loc>' . "\n";
            echo '  </sitemap>' . "\n";
        }
    } catch (Exception $e) {}

    echo '</sitemapindex>' . "\n";
}

/**
 * Category sitemap: the category page + all its products.
 */
function renderCategorySitemap(string $baseUrl, string $categorySlug): void {
    // Static pages sitemap
    if ($categorySlug === 'general') {
        echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        echo '  <url><loc>' . $baseUrl . '/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>' . "\n";
        echo '  <url><loc>' . $baseUrl . '/productos</loc><changefreq>daily</changefreq><priority>0.9</priority></url>' . "\n";
        echo '</urlset>' . "\n";
        return;
    }

    try {
        $categories = getCategories();
        $category = null;
        foreach ($categories as $cat) {
            if (($cat['slug'] ?? '') === $categorySlug) {
                $category = $cat;
                break;
            }
        }

        if (!$category) {
            http_response_code(404);
            echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>' . "\n";
            return;
        }

        // Fetch all products in this category
        $products = [];
        $offset = 0;
        $limit = 100;
        do {
            $results = searchProducts('', [
                'filter' => 'category = "' . addslashes($category['id']) . '"',
                'limit' => $limit,
                'offset' => $offset,
                'attributesToRetrieve' => ['slug'],
            ]);
            foreach ($results['hits'] as $product) {
                $products[] = $product['slug'];
            }
            $offset += $limit;
        } while (count($results['hits']) === $limit);

    } catch (Exception $e) {
        $products = [];
        $category = ['slug' => $categorySlug, 'name' => $categorySlug];
    }

    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

    // Category page
    echo '  <url>' . "\n";
    echo '    <loc>' . htmlspecialchars($baseUrl . '/productos?categoria=' . urlencode($categorySlug)) . '</loc>' . "\n";
    echo '    <changefreq>weekly</changefreq>' . "\n";
    echo '    <priority>0.7</priority>' . "\n";
    echo '  </url>' . "\n";

    // Products
    foreach ($products as $slug) {
        echo '  <url>' . "\n";
        echo '    <loc>' . htmlspecialchars($baseUrl . '/producto/' . $slug) . '</loc>' . "\n";
        echo '    <changefreq>weekly</changefreq>' . "\n";
        echo '    <priority>0.6</priority>' . "\n";
        echo '  </url>' . "\n";
    }

    echo '</urlset>' . "\n";
}
