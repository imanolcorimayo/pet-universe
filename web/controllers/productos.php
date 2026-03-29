<?php
$page_title = 'Productos — ' . SITE_NAME;

// Get all categories
$categories = getCategories();

// Parse query params
$categorySlug = sanitizeSearch($_GET['categoria'] ?? '');
$sortParam = $_GET['orden'] ?? 'name_asc';
$page = max(1, intval($_GET['pagina'] ?? 1));
$limit = PRODUCTS_PER_PAGE;
$offset = ($page - 1) * $limit;

// Build Meilisearch filter
$filters = [];
if ($categorySlug) {
    // Find category ID by slug
    $categoryId = null;
    foreach ($categories as $cat) {
        if (($cat['slug'] ?? '') === $categorySlug) {
            $categoryId = $cat['id'];
            $page_title = htmlspecialchars($cat['name']) . ' — ' . SITE_NAME;
            break;
        }
    }
    if ($categoryId) {
        $filters[] = 'category = "' . addslashes($categoryId) . '"';
    }
}

$filterString = !empty($filters) ? implode(' AND ', $filters) : null;

// Sort mapping
$sortMap = [
    'name_asc'   => ['name:asc'],
    'price_asc'  => ['priceRegular:asc'],
    'price_desc' => ['priceRegular:desc'],
];
$sort = $sortMap[$sortParam] ?? $sortMap['name_asc'];

// Search
$searchOptions = [
    'limit' => $limit,
    'offset' => $offset,
    'sort' => $sort,
];
if ($filterString) {
    $searchOptions['filter'] = $filterString;
}

$results = searchProducts('', $searchOptions);
$products = $results['hits'] ?? [];
$totalHits = $results['estimatedTotalHits'] ?? 0;
$totalPages = ceil($totalHits / $limit);

// Build current URL for pagination/sort links
function buildUrl(array $overrides = []): string {
    $params = array_merge($_GET, $overrides);
    $params = array_filter($params, fn($v) => $v !== '' && $v !== null);
    return '/productos' . ($params ? '?' . http_build_query($params) : '');
}

require __DIR__ . '/../includes/header.php';
?>

<section class="section">
  <div class="container">

    <!-- Mobile category pills -->
    <div class="category-pills">
      <a href="/productos" class="category-pill <?= !$categorySlug ? 'active' : '' ?>">Todos</a>
      <?php foreach ($categories as $cat): ?>
        <a href="<?= buildUrl(['categoria' => $cat['slug'], 'pagina' => 1]) ?>"
           class="category-pill <?= $categorySlug === ($cat['slug'] ?? '') ? 'active' : '' ?>">
          <?= htmlspecialchars($cat['name']) ?>
        </a>
      <?php endforeach; ?>
    </div>

    <div class="listing-layout">
      <!-- Sidebar (desktop) -->
      <aside class="listing-sidebar">
        <h3 class="sidebar-title">Categorias</h3>
        <ul class="category-list">
          <li><a href="/productos" class="<?= !$categorySlug ? 'active' : '' ?>">Todos los productos</a></li>
          <?php foreach ($categories as $cat): ?>
            <li>
              <a href="<?= buildUrl(['categoria' => $cat['slug'], 'pagina' => 1]) ?>"
                 class="<?= $categorySlug === ($cat['slug'] ?? '') ? 'active' : '' ?>">
                <?= htmlspecialchars($cat['name']) ?>
              </a>
            </li>
          <?php endforeach; ?>
        </ul>
      </aside>

      <!-- Products -->
      <div>
        <div class="listing-toolbar">
          <span class="listing-count"><?= $totalHits ?> producto<?= $totalHits !== 1 ? 's' : '' ?></span>
          <div class="listing-sort">
            <select onchange="window.location.href=this.value">
              <option value="<?= buildUrl(['orden' => 'name_asc']) ?>" <?= $sortParam === 'name_asc' ? 'selected' : '' ?>>Nombre A-Z</option>
              <option value="<?= buildUrl(['orden' => 'price_asc']) ?>" <?= $sortParam === 'price_asc' ? 'selected' : '' ?>>Precio menor</option>
              <option value="<?= buildUrl(['orden' => 'price_desc']) ?>" <?= $sortParam === 'price_desc' ? 'selected' : '' ?>>Precio mayor</option>
            </select>
          </div>
        </div>

        <?php if (empty($products)): ?>
          <div class="empty-state">
            <h3>No se encontraron productos</h3>
            <p>Proba con otra categoria o <a href="/productos">ve todos los productos</a>.</p>
          </div>
        <?php else: ?>
          <div class="product-grid">
            <?php foreach ($products as $product): ?>
              <?php require __DIR__ . '/_product_card.php'; ?>
            <?php endforeach; ?>
          </div>

          <!-- Pagination -->
          <?php if ($totalPages > 1): ?>
            <div class="pagination">
              <?php if ($page > 1): ?>
                <a href="<?= buildUrl(['pagina' => $page - 1]) ?>"><iconify-icon icon="lucide:chevron-left" width="16" height="16"></iconify-icon> Anterior</a>
              <?php else: ?>
                <span class="disabled"><iconify-icon icon="lucide:chevron-left" width="16" height="16"></iconify-icon> Anterior</span>
              <?php endif; ?>

              <?php
              // Show pages with ellipsis
              $range = 2;
              for ($i = 1; $i <= $totalPages; $i++):
                if ($i === 1 || $i === $totalPages || abs($i - $page) <= $range):
              ?>
                <?php if ($i === $page): ?>
                  <span class="active"><?= $i ?></span>
                <?php else: ?>
                  <a href="<?= buildUrl(['pagina' => $i]) ?>"><?= $i ?></a>
                <?php endif; ?>
              <?php
                elseif ($i === 2 || $i === $totalPages - 1):
              ?>
                <span class="ellipsis">...</span>
              <?php
                endif;
              endfor;
              ?>

              <?php if ($page < $totalPages): ?>
                <a href="<?= buildUrl(['pagina' => $page + 1]) ?>">Siguiente <iconify-icon icon="lucide:chevron-right" width="16" height="16"></iconify-icon></a>
              <?php else: ?>
                <span class="disabled">Siguiente <iconify-icon icon="lucide:chevron-right" width="16" height="16"></iconify-icon></span>
              <?php endif; ?>
            </div>
          <?php endif; ?>
        <?php endif; ?>
      </div>
    </div>

  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
