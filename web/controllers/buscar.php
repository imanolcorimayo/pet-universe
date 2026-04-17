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
$products = $results['hits'] ?? [];
$totalHits = $results['estimatedTotalHits'] ?? 0;

require __DIR__ . '/../includes/header.php';
?>

<section class="py-10 md:py-14">
  <div class="w-full max-w-[1200px] mx-auto px-5">

    <?php if ($query): ?>
      <p class="text-[14px] text-muted mb-6">
        <strong class="text-navy"><?= $totalHits ?></strong> resultado<?= $totalHits !== 1 ? 's' : '' ?> para "<strong class="text-navy"><?= htmlspecialchars($query) ?></strong>"
      </p>
    <?php endif; ?>

    <?php if (empty($products)): ?>
      <div class="text-center px-4 py-14 text-muted">
        <h3 class="font-display text-[1.2rem] mb-2.5 text-navy">No se encontraron productos</h3>
        <p>Proba con otra busqueda o <a href="/productos" class="text-primary hover:text-navy transition-colors">explora todas las categorias</a>.</p>
      </div>
    <?php else: ?>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[18px]">
        <?php foreach ($products as $product): ?>
          <?php require __DIR__ . '/_product_card.php'; ?>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>

  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
