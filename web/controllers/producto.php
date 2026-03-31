<?php
// $slug is set by the router (index.php)
$product = getProductBySlug($slug);

if (!$product) {
    http_response_code(404);
    require __DIR__ . '/404.php';
    return;
}

$page_title = htmlspecialchars($product['name']) . ' — ' . SITE_NAME;
$page_description = trim(($product['brand'] ?? '') . ' ' . $product['name'] . '. ' . ($product['description'] ?? ''));
$isDual = ($product['trackingType'] ?? '') === 'dual';

$productJson = htmlspecialchars(json_encode([
    'id' => $product['id'],
    'slug' => $product['slug'],
    'name' => $product['name'],
    'brand' => $product['brand'] ?? '',
    'priceRegular' => $product['priceRegular'],
    'priceCash' => $product['priceCash'] ?? 0,
    'priceKgRegular' => $product['priceKgRegular'] ?? 0,
    'priceKgCash' => $product['priceKgCash'] ?? 0,
    'trackingType' => $product['trackingType'] ?? 'unit',
    'unitWeight' => $product['unitWeight'] ?? 0,
]), ENT_QUOTES, 'UTF-8');

$waText = urlencode("Hola! Quiero consultar por: " . $product['name']);
$imgV = $product['imageUpdatedAt'] ?? 0;
$page_og_image = !empty($product['hasImage']) ? productImageUrl($product['slug'], 'lg', 'jpg') . '?v=' . $imgV : null;

require __DIR__ . '/../includes/header.php';
?>

<section class="section">
  <div class="container">

    <!-- Breadcrumb -->
    <nav class="breadcrumb">
      <a href="/">Inicio</a>
      <iconify-icon icon="lucide:chevron-right" width="14" height="14" class="breadcrumb-sep"></iconify-icon>
      <a href="/productos">Productos</a>
      <?php if (!empty($product['categoryName'])): ?>
        <iconify-icon icon="lucide:chevron-right" width="14" height="14" class="breadcrumb-sep"></iconify-icon>
        <a href="/productos?categoria=<?= urlencode(strtolower(str_replace(' ', '-', $product['categoryName']))) ?>">
          <?= htmlspecialchars($product['categoryName']) ?>
        </a>
      <?php endif; ?>
      <iconify-icon icon="lucide:chevron-right" width="14" height="14" class="breadcrumb-sep"></iconify-icon>
      <span><?= htmlspecialchars($product['name']) ?></span>
    </nav>

    <div class="product-detail">
      <!-- Image -->
      <div class="product-detail-image">
        <?php if (!empty($product['hasImage'])): ?>
          <picture>
            <source type="image/avif" srcset="<?= productImageUrl($product['slug'], 'md', 'avif') ?>?v=<?= $imgV ?>">
            <source type="image/webp" srcset="<?= productImageUrl($product['slug'], 'md', 'webp') ?>?v=<?= $imgV ?>">
            <img
              src="<?= productImageUrl($product['slug'], 'md', 'jpg') ?>?v=<?= $imgV ?>"
              alt="<?= htmlspecialchars($product['name']) ?>"
              width="600"
              height="600"
              onerror="imgFallback(this)"
            >
          </picture>
          <iconify-icon icon="lucide:package" width="120" height="120" class="product-detail-placeholder" style="display:none;"></iconify-icon>
        <?php else: ?>
          <iconify-icon icon="lucide:package" width="120" height="120" class="product-detail-placeholder"></iconify-icon>
        <?php endif; ?>
      </div>

      <!-- Info -->
      <div class="product-detail-info">
        <?php if (!empty($product['categoryName'])): ?>
          <span class="product-detail-category"><?= htmlspecialchars($product['categoryName']) ?></span>
        <?php endif; ?>

        <h1 class="product-detail-name"><?= htmlspecialchars($product['name']) ?></h1>

        <?php if (!empty($product['brand'])): ?>
          <span class="product-detail-brand"><?= htmlspecialchars($product['brand']) ?></span>
        <?php endif; ?>

        <?php if ($isDual && !empty($product['priceKgRegular'])): ?>
          <!-- Dual product: buy mode toggle -->
          <div class="buy-mode-toggle" id="buy-mode-toggle">
            <button class="buy-mode-btn active" data-mode="kg" onclick="setBuyMode('kg')">Por kg</button>
            <button class="buy-mode-btn" data-mode="unit" onclick="setBuyMode('unit')">Por bolsa (<?= $product['unitWeight'] ?>kg)</button>
          </div>

          <!-- Kg pricing (default) -->
          <div class="product-detail-price" id="price-kg">
            <?= formatPrice($product['priceKgRegular']) ?><span class="price-unit">/kg</span>
            <?php if (!empty($product['priceKgCash']) && $product['priceKgCash'] < $product['priceKgRegular']): ?>
              <div class="product-detail-price-cash">
                Efectivo / Transferencia: <?= formatPrice($product['priceKgCash']) ?>/kg
              </div>
            <?php endif; ?>
          </div>

          <!-- Unit pricing (hidden by default) -->
          <div class="product-detail-price" id="price-unit" style="display:none;">
            <?= formatPrice($product['priceRegular']) ?>
            <?php if (!empty($product['priceCash']) && $product['priceCash'] < $product['priceRegular']): ?>
              <div class="product-detail-price-cash">
                Efectivo / Transferencia: <?= formatPrice($product['priceCash']) ?>
              </div>
            <?php endif; ?>
          </div>

        <?php else: ?>
          <!-- Standard product -->
          <div class="product-detail-price">
            <?= formatPrice($product['priceRegular']) ?>
            <?php if (!empty($product['priceCash']) && $product['priceCash'] < $product['priceRegular']): ?>
              <div class="product-detail-price-cash">
                Efectivo / Transferencia: <?= formatPrice($product['priceCash']) ?>
              </div>
            <?php endif; ?>
          </div>
        <?php endif; ?>

        <?php if (!empty($product['description'])): ?>
          <p class="product-detail-description"><?= nl2br(htmlspecialchars($product['description'])) ?></p>
        <?php endif; ?>

        <?php if (!isset($product['inStock']) || $product['inStock']): ?>
          <div class="product-detail-actions">
            <?php if ($isDual && !empty($product['priceKgRegular'])): ?>
              <!-- Kg mode qty (default) -->
              <div class="qty-selector" id="qty-kg">
                <button class="qty-btn" onclick="stepKgQty(-0.5)">-</button>
                <input type="number" id="product-qty-kg" class="qty-input" value="1" min="0.5" step="0.5" style="width:60px;">
                <button class="qty-btn" onclick="stepKgQty(0.5)">+</button>
                <span class="qty-label">kg</span>
              </div>
              <!-- Unit mode qty (hidden) -->
              <div class="qty-selector" id="qty-unit" style="display:none;">
                <button class="qty-btn" onclick="document.getElementById('product-qty-unit').stepDown()">-</button>
                <input type="number" id="product-qty-unit" class="qty-input" value="1" min="1" step="1">
                <button class="qty-btn" onclick="document.getElementById('product-qty-unit').stepUp()">+</button>
                <span class="qty-label">bolsa</span>
              </div>
            <?php else: ?>
              <div class="qty-selector">
                <button class="qty-btn" onclick="document.getElementById('product-qty').stepDown()">-</button>
                <input type="number" id="product-qty" class="qty-input" value="1" min="1">
                <button class="qty-btn" onclick="document.getElementById('product-qty').stepUp()">+</button>
              </div>
            <?php endif; ?>
            <button class="btn btn-primary" onclick="addToCartFromDetail('<?= $productJson ?>')">
              <iconify-icon icon="lucide:shopping-bag" width="16" height="16"></iconify-icon>
              Agregar al carrito
            </button>
          </div>
        <?php else: ?>
          <p class="product-card-stock-out" style="font-size:16px;">
            <iconify-icon icon="lucide:x-circle" width="18" height="18"></iconify-icon>
            Sin stock
          </p>
        <?php endif; ?>

        <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>?text=<?= $waText ?>" class="btn btn-whatsapp btn-sm" target="_blank">
          <iconify-icon icon="mdi:whatsapp" width="16" height="16"></iconify-icon>
          Consultar por WhatsApp
        </a>
      </div>
    </div>

  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>

<?php if ($isDual): ?>
<script>
  let currentBuyMode = 'kg';

  function setBuyMode(mode) {
    currentBuyMode = mode;
    document.getElementById('price-kg').style.display = mode === 'kg' ? '' : 'none';
    document.getElementById('price-unit').style.display = mode === 'unit' ? '' : 'none';
    document.getElementById('qty-kg').style.display = mode === 'kg' ? '' : 'none';
    document.getElementById('qty-unit').style.display = mode === 'unit' ? '' : 'none';

    document.querySelectorAll('.buy-mode-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  function stepKgQty(delta) {
    var input = document.getElementById('product-qty-kg');
    var val = parseFloat(input.value) || 1;
    val = Math.max(0.5, Math.round((val + delta) * 10) / 10);
    input.value = val;
  }

  function addToCartFromDetail(productJson) {
    var product = typeof productJson === 'string' ? JSON.parse(productJson) : productJson;
    if (product.trackingType === 'dual') {
      if (currentBuyMode === 'kg') {
        var qty = parseFloat(document.getElementById('product-qty-kg').value) || 1;
        cart.addItem({
          id: product.id + '_kg',
          slug: product.slug,
          name: product.name + ' (por kg)',
          brand: product.brand,
          price: product.priceKgRegular,
          priceCash: product.priceKgCash,
          quantity: qty,
          buyMode: 'kg',
        }, qty);
      } else {
        var qty = parseInt(document.getElementById('product-qty-unit').value) || 1;
        cart.addItem({
          id: product.id + '_unit',
          slug: product.slug,
          name: product.name + ' (bolsa ' + product.unitWeight + 'kg)',
          brand: product.brand,
          price: product.priceRegular,
          priceCash: product.priceCash,
          quantity: qty,
          buyMode: 'unit',
        }, qty);
      }
    } else {
      addToCart(productJson);
    }
  }
</script>
<?php else: ?>
<script>
  function addToCartFromDetail(productJson) { addToCart(productJson); }
</script>
<?php endif; ?>
