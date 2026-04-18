<?php
$query = sanitizeSearch($_GET['q'] ?? '');
$isAjax = isset($_GET['ajax']);

// Search products
$results = ['hits' => [], 'estimatedTotalHits' => 0];
if (strlen($query) >= 2) {
    $results = searchProducts($query, [
        'limit' => $isAjax ? 5 : 48,
    ]);
}

// AJAX: return JSON for autocomplete
if ($isAjax) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'hits' => $results['hits'] ?? [],
        'estimatedTotalHits' => $results['estimatedTotalHits'] ?? 0,
    ]);
    exit;
}

$page_title = "Buscar: $query — " . SITE_NAME;
$products   = $results['hits'] ?? [];
$totalHits  = $results['estimatedTotalHits'] ?? 0;

require __DIR__ . '/../includes/header.php';
?>

<section class="py-5 md:py-8">
  <div class="w-full max-w-[1280px] mx-auto px-3 md:px-5">

    <nav class="flex items-center gap-2 text-[12.5px] text-muted mb-3 md:mb-4 flex-wrap">
      <a href="/" class="text-muted transition-colors hover:text-primary">Inicio</a>
      <iconify-icon icon="lucide:chevron-right" width="13" height="13" class="opacity-40"></iconify-icon>
      <span class="text-navy">Búsqueda<?= $query ? ': ' . htmlspecialchars($query) : '' ?></span>
    </nav>

    <div class="flex items-end justify-between gap-3 mb-3 md:mb-4 flex-wrap">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-light text-primary">
          <iconify-icon icon="lucide:search" width="15" height="15"></iconify-icon>
        </span>
        <h1 class="font-display text-[18px] md:text-[22px] font-semibold text-navy leading-none">
          <?php if ($query): ?>
            Resultados para "<?= htmlspecialchars($query) ?>"
          <?php else: ?>
            Búsqueda
          <?php endif; ?>
        </h1>
        <?php if ($query): ?>
          <span class="text-[12.5px] text-muted tabular-nums pl-1"><?= $totalHits ?> resultado<?= $totalHits !== 1 ? 's' : '' ?></span>
        <?php endif; ?>
      </div>
    </div>

    <?php if (empty($products)): ?>
      <div class="text-center px-4 py-14 text-muted bg-white rounded-2xl border border-hairline">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-light text-primary mb-3">
          <iconify-icon icon="lucide:search-x" width="26" height="26"></iconify-icon>
        </div>
        <h3 class="font-display text-[1.2rem] mb-2.5 text-navy">No se encontraron productos</h3>
        <p>Probá con otra búsqueda o <a href="/productos" class="text-primary hover:text-navy transition-colors">explorá todas las categorías</a>.</p>
      </div>
    <?php else: ?>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
        <?php foreach ($products as $product): ?>
          <?php require __DIR__ . '/_product_card.php'; ?>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>

  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
