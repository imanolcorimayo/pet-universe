<?php
$page_title = 'Productos — ' . SITE_NAME;
$page_description = 'Catálogo de alimentos, accesorios y productos para tu mascota. Retirá en el local o envíos a domicilio en Córdoba.';

$categories = getCategories();

// ─── Parse query params ───────────────────────────────
$categorySlug = sanitizeSearch($_GET['categoria'] ?? '');
$sortParam    = $_GET['orden'] ?? 'name_asc';
$page         = max(1, intval($_GET['pagina'] ?? 1));
$ofertaFilter = !empty($_GET['oferta']);
$priceMax     = max(0, intval($_GET['precio_max'] ?? 0));

$rawBrands = $_GET['marcas'] ?? [];
if (is_string($rawBrands)) {
    $rawBrands = explode(',', $rawBrands);
}
$brandFilters = array_values(array_filter(array_map('trim', (array)$rawBrands), fn($b) => $b !== ''));

$limit = PRODUCTS_PER_PAGE;

// ─── Resolve active category ──────────────────────────
$categoryId     = null;
$activeCategory = null;
if ($categorySlug) {
    foreach ($categories as $cat) {
        if (($cat['slug'] ?? '') === $categorySlug) {
            $categoryId       = $cat['id'];
            $activeCategory   = $cat;
            $page_title       = htmlspecialchars($cat['name']) . ' — ' . SITE_NAME;
            $page_description = htmlspecialchars($cat['name']) . ' para tu mascota en Pet Universe Córdoba. ' . SITE_TAGLINE . '.';
            $page_canonical   = SITE_URL . '/productos?categoria=' . urlencode($categorySlug);
            break;
        }
    }
}

// Breadcrumb JSON-LD: Home → Productos → [Category if any]
$breadcrumb = [
    '@context' => 'https://schema.org',
    '@type'    => 'BreadcrumbList',
    'itemListElement' => [
        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Inicio',    'item' => SITE_URL . '/'],
        ['@type' => 'ListItem', 'position' => 2, 'name' => 'Productos', 'item' => SITE_URL . '/productos'],
    ],
];
if ($activeCategory) {
    $breadcrumb['itemListElement'][] = [
        '@type'    => 'ListItem',
        'position' => 3,
        'name'     => $activeCategory['name'],
        'item'     => SITE_URL . '/productos?categoria=' . urlencode($categorySlug),
    ];
}
$page_jsonld = [$breadcrumb];

// ─── Build Meili filters ──────────────────────────────
// Base filter = inStock + optional category. Brands are applied on top
// for the product search, but the brand facet list is fetched with the
// base filter only, so the full brand list for the current category
// stays visible regardless of which brands are checked.
$baseFilters = ['inStock = true'];
if ($categoryId) {
    $baseFilters[] = 'category = "' . addslashes($categoryId) . '"';
}
$baseFilterString = implode(' AND ', $baseFilters);

$productFilters = $baseFilters;
if (!empty($brandFilters)) {
    $brandList = array_map(fn($b) => '"' . addslashes($b) . '"', $brandFilters);
    $productFilters[] = 'brand IN [' . implode(',', $brandList) . ']';
}
if ($ofertaFilter) {
    $productFilters[] = 'priceOferta > 0';
}
$productFilterString = implode(' AND ', $productFilters);

// ─── Sort map ─────────────────────────────────────────
$sortMap = [
    'name_asc'   => ['name:asc'],
    'price_asc'  => ['priceRegular:asc'],
    'price_desc' => ['priceRegular:desc'],
];
$sort = $sortMap[$sortParam] ?? $sortMap['name_asc'];

// ─── Fetch products (large limit — priceMax is still post-filtered in PHP) ─
$results = searchProducts('', [
    'limit'  => 500,
    'sort'   => $sort,
    'filter' => $productFilterString,
]);
$allHits = $results['hits'] ?? [];

// ─── Brand facets: fetched separately without brand filter ───
$facetResults = searchProducts('', [
    'limit'  => 0,
    'filter' => $baseFilterString,
    'facets' => ['brand'],
]);
$brandFacets = $facetResults['facetDistribution']['brand'] ?? [];

// ─── Post-filters ─────────────────────────────────────
$priceMaxBound = 120000;

if ($priceMax > 0 && $priceMax < $priceMaxBound) {
    $allHits = array_values(array_filter($allHits, function ($p) use ($priceMax) {
        $price = $p['priceCash'] ?: ($p['priceRegular'] ?? 0);
        return $price > 0 && $price <= $priceMax;
    }));
}

// Count of in-stock ofertas for the filter chip label. Cheap separate query
// that ignores brand filters so the chip reflects the full category scope.
$ofertaCountFilters = $baseFilters;
$ofertaCountFilters[] = 'priceOferta > 0';
$ofertaCountResult = searchProducts('', [
    'limit'  => 0,
    'filter' => implode(' AND ', $ofertaCountFilters),
]);
$ofertaCount = $ofertaCountResult['estimatedTotalHits'] ?? 0;

// Brands that are still checked but absent from current facets (e.g. the
// user followed a link with a stale brand filter). Re-inject them with a
// 0 count so the checkbox still renders as checked.
$facetBrandNames = array_map('strval', array_keys($brandFacets));
foreach ($brandFilters as $b) {
    if (!in_array($b, $facetBrandNames, true)) {
        $brandFacets[$b] = 0;
    }
}

$totalHits  = count($allHits);
$totalPages = max(1, (int)ceil($totalHits / $limit));
$page       = min($page, $totalPages);
$products   = array_slice($allHits, ($page - 1) * $limit, $limit);

// ─── Brand list (sorted by count desc, then name asc) ─
$brandListFacets = [];
foreach ($brandFacets as $brandName => $cnt) {
    if ($brandName === '') continue;
    $brandListFacets[] = ['name' => $brandName, 'count' => $cnt];
}
usort($brandListFacets, fn($a, $b) => ($b['count'] <=> $a['count']) ?: strcmp($a['name'], $b['name']));

// ─── URL builder ──────────────────────────────────────
function buildProductsUrl(array $overrides = []): string {
    $params = array_merge($_GET, $overrides);
    $params = array_filter($params, function ($v) {
        if (is_array($v)) return !empty($v);
        return $v !== '' && $v !== null && $v !== false;
    });
    return '/productos' . ($params ? '?' . http_build_query($params) : '');
}

$sliderValue = $priceMax > 0 ? $priceMax : $priceMaxBound;

// Badge count on the mobile "Filtros" button.
$activeFilterCount = 0;
if ($ofertaFilter)       $activeFilterCount++;
if ($priceMax > 0)       $activeFilterCount++;
$activeFilterCount += count($brandFilters);

require __DIR__ . '/../includes/header.php';
?>

<section class="py-5 md:py-8">
  <div class="w-full max-w-[1280px] mx-auto px-3 md:px-5">

    <!-- ─── Page title + breadcrumb ──────────────────── -->
    <nav class="flex items-center gap-2 text-[12.5px] text-muted mb-3 md:mb-4 flex-wrap">
      <a href="/" class="text-muted transition-colors hover:text-primary">Inicio</a>
      <iconify-icon icon="lucide:chevron-right" width="13" height="13" class="opacity-40"></iconify-icon>
      <?php if ($activeCategory): ?>
        <a href="/productos" class="text-muted transition-colors hover:text-primary">Productos</a>
        <iconify-icon icon="lucide:chevron-right" width="13" height="13" class="opacity-40"></iconify-icon>
        <span class="text-navy"><?= htmlspecialchars($activeCategory['name']) ?></span>
      <?php else: ?>
        <span class="text-navy">Productos</span>
      <?php endif; ?>
    </nav>

    <div class="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 md:gap-7 items-start">

      <!-- ─── Sidebar filters ─────────────────────────── -->
      <aside id="filters-sidebar" class="hidden md:block md:sticky md:top-[154px] bg-white rounded-2xl border border-hairline p-5">
        <!-- Mobile drawer header (visible only when aside is in drawer mode) -->
        <div class="flex md:hidden items-center justify-between mb-4 pb-3 border-b border-hairline -mx-1">
          <h2 class="font-display text-[17px] font-semibold text-navy">Filtros</h2>
          <button type="button" onclick="toggleFilters(false)" aria-label="Cerrar filtros"
                  class="w-9 h-9 rounded-full inline-flex items-center justify-center text-navy hover:bg-primary-light hover:text-primary transition-colors">
            <iconify-icon icon="lucide:x" width="20" height="20"></iconify-icon>
          </button>
        </div>

        <div class="text-[10.5px] font-bold uppercase tracking-[2px] text-muted mb-3 pb-3 border-b border-hairline">Categorías</div>
        <ul class="flex flex-col gap-0.5 mb-5">
          <li>
            <a href="<?= buildProductsUrl(['categoria' => null, 'pagina' => null]) ?>"
               class="<?= 'block w-full text-left py-2 px-3 rounded-xl text-[13.5px] font-medium transition ' . (!$categorySlug ? 'bg-primary text-white font-semibold' : 'text-navy hover:bg-primary-light hover:text-primary') ?>">
              Todos los productos
            </a>
          </li>
          <?php foreach ($categories as $cat): ?>
            <?php $isActive = $categorySlug === ($cat['slug'] ?? ''); ?>
            <li>
              <a href="<?= buildProductsUrl(['categoria' => $cat['slug'], 'pagina' => null]) ?>"
                 class="<?= $isActive
                    ? 'flex items-center gap-2 w-full text-left py-2 px-3 rounded-xl text-[13.5px] font-semibold transition bg-primary text-white'
                    : 'flex items-center gap-2 w-full text-left py-2 px-3 rounded-xl text-[13.5px] font-medium transition text-navy hover:bg-primary-light hover:text-primary' ?>">
                <iconify-icon icon="<?= getCategoryIcon($cat['name']) ?>" width="14" class="opacity-70"></iconify-icon>
                <?= htmlspecialchars($cat['name']) ?>
              </a>
            </li>
          <?php endforeach; ?>
        </ul>

        <form id="filters-form" action="/productos#resultados" method="GET">
          <?php if ($categorySlug): ?>
            <input type="hidden" name="categoria" value="<?= htmlspecialchars($categorySlug) ?>">
          <?php endif; ?>
          <?php if ($sortParam && $sortParam !== 'name_asc'): ?>
            <input type="hidden" name="orden" value="<?= htmlspecialchars($sortParam) ?>">
          <?php endif; ?>

          <div class="text-[10.5px] font-bold uppercase tracking-[2px] text-muted mb-3 pb-3 border-b border-hairline">Filtros</div>

          <label class="flex items-center gap-2.5 py-1.5 cursor-pointer">
            <input type="checkbox" name="oferta" value="1" <?= $ofertaFilter ? 'checked' : '' ?>
                   class="w-4 h-4 accent-primary">
            <span class="text-[13.5px] text-navy font-medium">Solo ofertas</span>
            <?php if ($ofertaCount > 0): ?>
              <span class="ml-auto text-[10px] font-bold text-teal-deep bg-teal-wash px-1.5 py-[1px] rounded"><?= $ofertaCount ?></span>
            <?php endif; ?>
          </label>

          <div class="mt-3">
            <div class="text-[12px] font-semibold text-navy mb-2">Precio máximo</div>
            <input type="range" name="precio_max"
                   min="1000" max="<?= $priceMaxBound ?>" step="5000"
                   value="<?= $sliderValue ?>"
                   oninput="document.getElementById('price-max-label').textContent = '$' + Number(this.value).toLocaleString('es-AR')"
                   class="w-full accent-primary">
            <div class="flex justify-between text-[11px] text-muted tabular-nums mt-1">
              <span>$1.000</span>
              <span id="price-max-label" class="font-semibold text-primary">$<?= number_format($sliderValue, 0, ',', '.') ?></span>
            </div>
          </div>

          <?php if (!empty($brandListFacets)): ?>
          <div class="mt-5">
            <div class="text-[12px] font-semibold text-navy mb-2">Marcas</div>
            <div class="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
              <?php foreach ($brandListFacets as $b): ?>
                <label class="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" name="marcas[]"
                         value="<?= htmlspecialchars($b['name']) ?>"
                         <?= in_array($b['name'], $brandFilters, true) ? 'checked' : '' ?>
                         class="w-3.5 h-3.5 accent-primary">
                  <span class="text-[12.5px] text-navy/85 truncate flex-1"><?= htmlspecialchars($b['name']) ?></span>
                  <span class="text-[10px] text-muted tabular-nums shrink-0"><?= (int)$b['count'] ?></span>
                </label>
              <?php endforeach; ?>
            </div>
          </div>
          <?php endif; ?>

          <button id="apply-filters" type="submit"
                  class="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border-2 border-primary bg-primary text-white text-[13px] font-semibold tracking-[0.2px] transition-all hover:bg-navy hover:border-navy hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(64,15,255,0.28)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:hover:bg-primary disabled:hover:border-primary"
                  disabled>
            <iconify-icon icon="lucide:sliders-horizontal" width="14" height="14"></iconify-icon>
            Aplicar filtros
            <span id="apply-filters-count" class="hidden ml-0.5 px-1.5 py-[1px] rounded-full bg-white/20 text-[10px] font-bold tabular-nums"></span>
          </button>

          <?php if ($ofertaFilter || $priceMax > 0 || !empty($brandFilters)): ?>
            <a href="<?= buildProductsUrl(['oferta' => null, 'precio_max' => null, 'marcas' => null, 'pagina' => null]) ?>#resultados"
               class="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-primary transition-colors">
              <iconify-icon icon="lucide:x" width="13" height="13"></iconify-icon>
              Limpiar filtros
            </a>
          <?php endif; ?>
        </form>
      </aside>

      <!-- ─── Grid column ──────────────────────────────── -->
      <div>
        <span id="resultados" class="block -mt-4 pt-4"></span>

        <!-- Mobile filters toggle -->
        <button type="button" onclick="toggleFilters(true)"
                class="md:hidden w-full mb-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-hairline bg-white text-navy text-[13.5px] font-semibold transition-colors hover:border-primary hover:text-primary">
          <iconify-icon icon="lucide:sliders-horizontal" width="15" height="15"></iconify-icon>
          Filtros
          <?php if ($activeFilterCount > 0): ?>
            <span class="ml-1 px-1.5 py-[1px] rounded-full bg-primary text-white text-[10px] font-bold tabular-nums">
              <?= $activeFilterCount ?>
            </span>
          <?php endif; ?>
        </button>

        <!-- Header row: title + count + sort -->
        <div class="flex items-end justify-between gap-3 mb-3 md:mb-4 flex-wrap">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-light text-primary">
              <iconify-icon icon="<?= $activeCategory ? getCategoryIcon($activeCategory['name']) : 'lucide:package' ?>" width="15" height="15"></iconify-icon>
            </span>
            <h1 class="font-display text-[18px] md:text-[22px] font-semibold text-navy leading-none">
              <?= $activeCategory ? htmlspecialchars($activeCategory['name']) : 'Todos los productos' ?>
            </h1>
            <span class="text-[12.5px] text-muted tabular-nums pl-1"><?= $totalHits ?> producto<?= $totalHits !== 1 ? 's' : '' ?></span>
          </div>
          <select onchange="window.location.href=this.value"
                  class="py-2 px-3.5 border border-hairline rounded-full text-[13px] bg-white text-navy cursor-pointer outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20">
            <option value="<?= buildProductsUrl(['orden' => 'name_asc']) ?>" <?= $sortParam === 'name_asc' ? 'selected' : '' ?>>Nombre A-Z</option>
            <option value="<?= buildProductsUrl(['orden' => 'price_asc']) ?>" <?= $sortParam === 'price_asc' ? 'selected' : '' ?>>Precio menor</option>
            <option value="<?= buildProductsUrl(['orden' => 'price_desc']) ?>" <?= $sortParam === 'price_desc' ? 'selected' : '' ?>>Precio mayor</option>
          </select>
        </div>

        <?php if (empty($products)): ?>
          <div class="text-center px-4 py-14 text-muted bg-white rounded-2xl border border-hairline">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-light text-primary mb-3">
              <iconify-icon icon="lucide:package-x" width="26" height="26"></iconify-icon>
            </div>
            <h3 class="font-display text-[1.2rem] mb-2.5 text-navy">No se encontraron productos</h3>
            <p>Probá con otra categoría o <a href="/productos" class="text-primary hover:text-navy transition-colors">ver todos los productos</a>.</p>
          </div>
        <?php else: ?>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
            <?php foreach ($products as $product): ?>
              <?php require __DIR__ . '/_product_card.php'; ?>
            <?php endforeach; ?>
          </div>

          <?php if ($totalPages > 1):
            $pageBtnBase = 'inline-flex items-center justify-center min-w-[40px] h-[40px] px-3.5 rounded-full text-[13px] font-semibold border border-hairline text-navy transition-all';
          ?>
            <div class="flex items-center justify-center gap-1.5 mt-8 md:mt-10 flex-wrap">
              <?php if ($page > 1): ?>
                <a href="<?= buildProductsUrl(['pagina' => $page - 1]) ?>" class="<?= $pageBtnBase ?> gap-1 hover:border-primary hover:text-primary hover:bg-primary-light">
                  <iconify-icon icon="lucide:chevron-left" width="15" height="15"></iconify-icon>
                  Anterior
                </a>
              <?php else: ?>
                <span class="<?= $pageBtnBase ?> gap-1 opacity-[0.35] pointer-events-none">
                  <iconify-icon icon="lucide:chevron-left" width="15" height="15"></iconify-icon>
                  Anterior
                </span>
              <?php endif; ?>

              <?php
              $range = 2;
              for ($i = 1; $i <= $totalPages; $i++):
                if ($i === 1 || $i === $totalPages || abs($i - $page) <= $range):
              ?>
                <?php if ($i === $page): ?>
                  <span class="<?= $pageBtnBase ?> !bg-primary !text-white !border-primary"><?= $i ?></span>
                <?php else: ?>
                  <a href="<?= buildProductsUrl(['pagina' => $i]) ?>" class="<?= $pageBtnBase ?> hover:border-primary hover:text-primary hover:bg-primary-light"><?= $i ?></a>
                <?php endif; ?>
              <?php
                elseif ($i === 2 || $i === $totalPages - 1):
              ?>
                <span class="inline-flex items-center justify-center min-w-[20px] h-[40px] text-[14px] font-semibold text-navy/60 cursor-default">…</span>
              <?php
                endif;
              endfor;
              ?>

              <?php if ($page < $totalPages): ?>
                <a href="<?= buildProductsUrl(['pagina' => $page + 1]) ?>" class="<?= $pageBtnBase ?> gap-1 hover:border-primary hover:text-primary hover:bg-primary-light">
                  Siguiente
                  <iconify-icon icon="lucide:chevron-right" width="15" height="15"></iconify-icon>
                </a>
              <?php else: ?>
                <span class="<?= $pageBtnBase ?> gap-1 opacity-[0.35] pointer-events-none">
                  Siguiente
                  <iconify-icon icon="lucide:chevron-right" width="15" height="15"></iconify-icon>
                </span>
              <?php endif; ?>
            </div>
          <?php endif; ?>
        <?php endif; ?>
      </div>
    </div>

  </div>
</section>

<div id="filters-backdrop"
     class="md:hidden fixed inset-0 z-[101] bg-black/45 opacity-0 pointer-events-none transition-opacity duration-200"
     onclick="toggleFilters(false)"></div>

<script>
function toggleFilters(open) {
  var body    = document.body;
  var wantOpen = typeof open === 'boolean' ? open : !body.classList.contains('filters-open');
  body.classList.toggle('filters-open', wantOpen);
  var backdrop = document.getElementById('filters-backdrop');
  if (backdrop) {
    backdrop.classList.toggle('opacity-100', wantOpen);
    backdrop.classList.toggle('pointer-events-auto', wantOpen);
    backdrop.classList.toggle('opacity-0', !wantOpen);
    backdrop.classList.toggle('pointer-events-none', !wantOpen);
  }
}
</script>

<script>
(function () {
  var form = document.getElementById('filters-form');
  var btn  = document.getElementById('apply-filters');
  var countEl = document.getElementById('apply-filters-count');
  if (!form || !btn) return;

  // Serialize form state, ignoring hidden inputs that just preserve context
  // (categoria, orden) — those don't count as "pending filter changes".
  function snapshot() {
    var data = new FormData(form);
    // Drop non-filter keys
    data.delete('categoria');
    data.delete('orden');
    var pairs = [];
    data.forEach(function (v, k) { pairs.push(k + '=' + v); });
    pairs.sort();
    return pairs.join('&');
  }

  // Count filter changes vs the initial snapshot — groups by input name,
  // so toggling two brand checkboxes counts as 2.
  function diffCount(a, b) {
    var setA = new Set(a ? a.split('&') : []);
    var setB = new Set(b ? b.split('&') : []);
    var diff = 0;
    setA.forEach(function (x) { if (!setB.has(x)) diff++; });
    setB.forEach(function (x) { if (!setA.has(x)) diff++; });
    return diff;
  }

  var initial = snapshot();

  function update() {
    var now = snapshot();
    var n = diffCount(initial, now);
    btn.disabled = n === 0;
    if (n > 0) {
      countEl.textContent = n;
      countEl.classList.remove('hidden');
    } else {
      countEl.classList.add('hidden');
    }
  }

  form.addEventListener('change', update);
  form.addEventListener('input', update);
  update();
})();
</script>

<?php require __DIR__ . '/../includes/footer.php'; ?>
