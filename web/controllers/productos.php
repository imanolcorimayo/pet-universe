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

$pillClass = 'shrink-0 py-2 px-[18px] rounded-full border border-hairline bg-white text-[13px] font-semibold text-navy whitespace-nowrap transition-all hover:bg-primary hover:text-white hover:border-primary [&.active]:bg-primary [&.active]:text-white [&.active]:border-primary';
$sidebarLinkClass = 'block py-2 px-3 rounded-xl text-navy text-[14px] font-medium transition-all hover:bg-primary-light hover:text-primary [&.active]:bg-primary [&.active]:text-white [&.active]:font-semibold';
$pageBtnBase = 'flex items-center justify-center min-w-[42px] h-[42px] px-3.5 rounded-xl text-[14px] font-semibold border border-hairline text-navy transition-all';

require __DIR__ . '/../includes/header.php';
?>

<section class="py-10 md:py-14">
  <div class="w-full max-w-[1200px] mx-auto px-5">

    <div class="scroll-row flex md:hidden gap-2 overflow-x-auto pb-4">
      <a href="/productos" class="<?= $pillClass . (!$categorySlug ? ' active' : '') ?>">Todos</a>
      <?php foreach ($categories as $cat): ?>
        <a href="<?= buildUrl(['categoria' => $cat['slug'], 'pagina' => 1]) ?>"
           class="<?= $pillClass . ($categorySlug === ($cat['slug'] ?? '') ? ' active' : '') ?>">
          <?= htmlspecialchars($cat['name']) ?>
        </a>
      <?php endforeach; ?>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-9 items-start">

      <aside class="hidden md:block sticky top-[84px] bg-white rounded-xl border border-hairline p-5">
        <h3 class="text-[12px] font-bold uppercase tracking-[0.5px] text-muted mb-3.5 pb-3 border-b border-hairline">Categorias</h3>
        <ul>
          <li class="mb-0.5"><a href="/productos" class="<?= $sidebarLinkClass . (!$categorySlug ? ' active' : '') ?>">Todos los productos</a></li>
          <?php foreach ($categories as $cat): ?>
            <li class="mb-0.5">
              <a href="<?= buildUrl(['categoria' => $cat['slug'], 'pagina' => 1]) ?>"
                 class="<?= $sidebarLinkClass . ($categorySlug === ($cat['slug'] ?? '') ? ' active' : '') ?>">
                <?= htmlspecialchars($cat['name']) ?>
              </a>
            </li>
          <?php endforeach; ?>
        </ul>
      </aside>

      <div>
        <div class="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <span class="text-[14px] text-muted"><?= $totalHits ?> producto<?= $totalHits !== 1 ? 's' : '' ?></span>
          <div>
            <select onchange="window.location.href=this.value"
                    class="py-2 px-3.5 border border-hairline rounded-xl text-[13px] bg-white text-navy cursor-pointer outline-none transition-colors focus:border-primary">
              <option value="<?= buildUrl(['orden' => 'name_asc']) ?>" <?= $sortParam === 'name_asc' ? 'selected' : '' ?>>Nombre A-Z</option>
              <option value="<?= buildUrl(['orden' => 'price_asc']) ?>" <?= $sortParam === 'price_asc' ? 'selected' : '' ?>>Precio menor</option>
              <option value="<?= buildUrl(['orden' => 'price_desc']) ?>" <?= $sortParam === 'price_desc' ? 'selected' : '' ?>>Precio mayor</option>
            </select>
          </div>
        </div>

        <?php if (empty($products)): ?>
          <div class="text-center px-4 py-14 text-muted">
            <h3 class="font-display text-[1.2rem] mb-2.5 text-navy">No se encontraron productos</h3>
            <p>Proba con otra categoria o <a href="/productos" class="text-primary hover:text-navy transition-colors">ve todos los productos</a>.</p>
          </div>
        <?php else: ?>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[18px]">
            <?php foreach ($products as $product): ?>
              <?php require __DIR__ . '/_product_card.php'; ?>
            <?php endforeach; ?>
          </div>

          <?php if ($totalPages > 1): ?>
            <div class="flex items-center justify-center gap-1.5 mt-10 flex-wrap">
              <?php if ($page > 1): ?>
                <a href="<?= buildUrl(['pagina' => $page - 1]) ?>" class="<?= $pageBtnBase ?> hover:border-primary hover:text-primary hover:bg-primary-light"><iconify-icon icon="lucide:chevron-left" width="16" height="16"></iconify-icon> Anterior</a>
              <?php else: ?>
                <span class="<?= $pageBtnBase ?> opacity-[0.35] pointer-events-none"><iconify-icon icon="lucide:chevron-left" width="16" height="16"></iconify-icon> Anterior</span>
              <?php endif; ?>

              <?php
              // Show pages with ellipsis
              $range = 2;
              for ($i = 1; $i <= $totalPages; $i++):
                if ($i === 1 || $i === $totalPages || abs($i - $page) <= $range):
              ?>
                <?php if ($i === $page): ?>
                  <span class="<?= $pageBtnBase ?> !bg-primary !text-white !border-primary"><?= $i ?></span>
                <?php else: ?>
                  <a href="<?= buildUrl(['pagina' => $i]) ?>" class="<?= $pageBtnBase ?> hover:border-primary hover:text-primary hover:bg-primary-light"><?= $i ?></a>
                <?php endif; ?>
              <?php
                elseif ($i === 2 || $i === $totalPages - 1):
              ?>
                <span class="flex items-center justify-center min-w-8 h-[42px] text-[14px] font-semibold text-navy cursor-default">...</span>
              <?php
                endif;
              endfor;
              ?>

              <?php if ($page < $totalPages): ?>
                <a href="<?= buildUrl(['pagina' => $page + 1]) ?>" class="<?= $pageBtnBase ?> hover:border-primary hover:text-primary hover:bg-primary-light">Siguiente <iconify-icon icon="lucide:chevron-right" width="16" height="16"></iconify-icon></a>
              <?php else: ?>
                <span class="<?= $pageBtnBase ?> opacity-[0.35] pointer-events-none">Siguiente <iconify-icon icon="lucide:chevron-right" width="16" height="16"></iconify-icon></span>
              <?php endif; ?>
            </div>
          <?php endif; ?>
        <?php endif; ?>
      </div>
    </div>

  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
