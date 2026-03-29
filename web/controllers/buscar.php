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

<section class="section">
  <div class="container">

    <?php if ($query): ?>
      <p class="search-results-header">
        <strong><?= $totalHits ?></strong> resultado<?= $totalHits !== 1 ? 's' : '' ?> para "<strong><?= htmlspecialchars($query) ?></strong>"
      </p>
    <?php endif; ?>

    <?php if (empty($products)): ?>
      <div class="empty-state">
        <h3>No se encontraron productos</h3>
        <p>Proba con otra busqueda o <a href="/productos">explora todas las categorias</a>.</p>
      </div>
    <?php else: ?>
      <div class="product-grid">
        <?php foreach ($products as $product): ?>
          <?php require __DIR__ . '/_product_card.php'; ?>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>

  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
