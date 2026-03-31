<?php
// Expects $product variable to be set
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
?>
<div class="product-card">
  <a href="/producto/<?= htmlspecialchars($product['slug']) ?>" class="product-card-image">
    <?php $imgV = $product['imageUpdatedAt'] ?? 0; ?>
    <?php if (!empty($product['hasImage'])): ?>
      <picture>
        <source type="image/avif" srcset="<?= productImageUrl($product['slug'], 'sm', 'avif') ?>?v=<?= $imgV ?>">
        <source type="image/webp" srcset="<?= productImageUrl($product['slug'], 'sm', 'webp') ?>?v=<?= $imgV ?>">
        <img
          src="<?= productImageUrl($product['slug'], 'sm', 'jpg') ?>?v=<?= $imgV ?>"
          alt="<?= htmlspecialchars($product['name']) ?>"
          loading="lazy"
          width="300"
          height="300"
          onerror="imgFallback(this)"
        >
      </picture>
      <iconify-icon icon="lucide:package" width="52" height="52" class="product-card-placeholder" style="display:none;"></iconify-icon>
    <?php else: ?>
      <iconify-icon icon="lucide:package" width="52" height="52" class="product-card-placeholder"></iconify-icon>
    <?php endif; ?>
  </a>
  <div class="product-card-body">
    <span class="product-card-category"><?= htmlspecialchars($product['categoryName'] ?? '') ?></span>
    <a href="/producto/<?= htmlspecialchars($product['slug']) ?>" class="product-card-name">
      <?= htmlspecialchars($product['name']) ?>
    </a>
    <?php if (!empty($product['brand'])): ?>
      <span class="product-card-brand"><?= htmlspecialchars($product['brand']) ?></span>
    <?php endif; ?>

    <?php if ($isDual && !empty($product['priceKgRegular'])): ?>
      <div class="product-card-price">
        <?= formatPrice($product['priceKgRegular']) ?><span class="price-unit">/kg</span>
        <span class="product-card-price-cash">Bolsa <?= $product['unitWeight'] ?>kg: <?= formatPrice($product['priceRegular']) ?></span>
      </div>
    <?php else: ?>
      <div class="product-card-price">
        <?= formatPrice($product['priceRegular']) ?>
        <?php if (!empty($product['priceCash']) && $product['priceCash'] < $product['priceRegular']): ?>
          <span class="product-card-price-cash">Efectivo: <?= formatPrice($product['priceCash']) ?></span>
        <?php endif; ?>
      </div>
    <?php endif; ?>

    <?php if (isset($product['inStock']) && !$product['inStock']): ?>
      <span class="product-card-stock-out">
        <iconify-icon icon="lucide:x-circle" width="14" height="14"></iconify-icon>
        Sin stock
      </span>
    <?php endif; ?>
  </div>
  <?php if (!isset($product['inStock']) || $product['inStock']): ?>
  <div class="product-card-actions">
    <button class="btn btn-primary btn-sm" onclick="addToCart('<?= $productJson ?>')">
      <iconify-icon icon="lucide:shopping-bag" width="14" height="14"></iconify-icon>
      Agregar al carrito
    </button>
  </div>
  <?php endif; ?>
</div>
