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

<section class="py-10 md:py-14">
  <div class="w-full max-w-[1200px] mx-auto px-5">

    <nav class="flex items-center gap-2 text-[13px] text-muted mb-7 flex-wrap">
      <a href="/" class="text-muted transition-colors hover:text-primary">Inicio</a>
      <iconify-icon icon="lucide:chevron-right" width="14" height="14" class="opacity-40 text-base"></iconify-icon>
      <a href="/productos" class="text-muted transition-colors hover:text-primary">Productos</a>
      <?php if (!empty($product['categoryName'])): ?>
        <iconify-icon icon="lucide:chevron-right" width="14" height="14" class="opacity-40 text-base"></iconify-icon>
        <a href="/productos?categoria=<?= urlencode(strtolower(str_replace(' ', '-', $product['categoryName']))) ?>"
           class="text-muted transition-colors hover:text-primary">
          <?= htmlspecialchars($product['categoryName']) ?>
        </a>
      <?php endif; ?>
      <iconify-icon icon="lucide:chevron-right" width="14" height="14" class="opacity-40 text-base"></iconify-icon>
      <span><?= htmlspecialchars($product['name']) ?></span>
    </nav>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-7 md:gap-12 items-start">

      <div class="aspect-square bg-gradient-to-br from-primary-light to-[#F2EDE6] rounded-[20px] flex items-center justify-center overflow-hidden">
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
          <iconify-icon icon="lucide:package" width="120" height="120" class="text-primary opacity-15" style="display:none;"></iconify-icon>
        <?php else: ?>
          <iconify-icon icon="lucide:package" width="120" height="120" class="text-primary opacity-15"></iconify-icon>
        <?php endif; ?>
      </div>

      <div class="flex flex-col gap-4">
        <?php if (!empty($product['categoryName'])): ?>
          <span class="inline-flex text-[11px] font-bold uppercase tracking-[0.6px] text-primary bg-primary-light px-3 py-1 rounded-full w-fit">
            <?= htmlspecialchars($product['categoryName']) ?>
          </span>
        <?php endif; ?>

        <h1 class="font-display text-[1.4rem] md:text-[2rem] font-semibold leading-[1.2]"><?= htmlspecialchars($product['name']) ?></h1>

        <?php if (!empty($product['brand'])): ?>
          <span class="text-[14px] text-muted"><?= htmlspecialchars($product['brand']) ?></span>
        <?php endif; ?>

        <?php if ($isDual && !empty($product['priceKgRegular'])): ?>
          <div id="buy-mode-toggle" class="flex border-2 border-primary rounded-full overflow-hidden w-fit">
            <button class="buy-mode-btn active" data-mode="kg" onclick="setBuyMode('kg')">Por kg</button>
            <button class="buy-mode-btn" data-mode="unit" onclick="setBuyMode('unit')">Por bolsa (<?= $product['unitWeight'] ?>kg)</button>
          </div>

          <div id="price-kg" class="text-[1.5rem] md:text-[2rem] font-bold text-navy">
            <?= formatPrice($product['priceKgRegular']) ?><span class="text-[0.55em] font-medium text-muted">/kg</span>
            <?php if (!empty($product['priceKgCash']) && $product['priceKgCash'] < $product['priceKgRegular']): ?>
              <div class="text-[14px] text-muted font-medium">
                Efectivo / Transferencia: <?= formatPrice($product['priceKgCash']) ?>/kg
              </div>
            <?php endif; ?>
          </div>

          <div id="price-unit" class="text-[1.5rem] md:text-[2rem] font-bold text-navy" style="display:none;">
            <?= formatPrice($product['priceRegular']) ?>
            <?php if (!empty($product['priceCash']) && $product['priceCash'] < $product['priceRegular']): ?>
              <div class="text-[14px] text-muted font-medium">
                Efectivo / Transferencia: <?= formatPrice($product['priceCash']) ?>
              </div>
            <?php endif; ?>
          </div>

        <?php else: ?>
          <div class="text-[1.5rem] md:text-[2rem] font-bold text-navy">
            <?= formatPrice($product['priceRegular']) ?>
            <?php if (!empty($product['priceCash']) && $product['priceCash'] < $product['priceRegular']): ?>
              <div class="text-[14px] text-muted font-medium">
                Efectivo / Transferencia: <?= formatPrice($product['priceCash']) ?>
              </div>
            <?php endif; ?>
          </div>
        <?php endif; ?>

        <?php if (!empty($product['description'])): ?>
          <p class="text-[15px] text-muted leading-[1.75]"><?= nl2br(htmlspecialchars($product['description'])) ?></p>
        <?php endif; ?>

        <?php if (!isset($product['inStock']) || $product['inStock']): ?>
          <div class="flex gap-3 items-center flex-wrap">
            <?php if ($isDual && !empty($product['priceKgRegular'])): ?>
              <div class="qty-selector" id="qty-kg">
                <button class="qty-btn" onclick="stepKgQty(-0.5)">-</button>
                <input type="number" id="product-qty-kg" class="qty-input" value="1" min="0.5" step="0.5" style="width:60px;">
                <button class="qty-btn" onclick="stepKgQty(0.5)">+</button>
                <span class="px-2.5 text-[13px] font-semibold text-muted flex items-center">kg</span>
              </div>
              <div class="qty-selector" id="qty-unit" style="display:none;">
                <button class="qty-btn" onclick="document.getElementById('product-qty-unit').stepDown()">-</button>
                <input type="number" id="product-qty-unit" class="qty-input" value="1" min="1" step="1">
                <button class="qty-btn" onclick="document.getElementById('product-qty-unit').stepUp()">+</button>
                <span class="px-2.5 text-[13px] font-semibold text-muted flex items-center">bolsa</span>
              </div>
            <?php else: ?>
              <div class="qty-selector">
                <button class="qty-btn" onclick="document.getElementById('product-qty').stepDown()">-</button>
                <input type="number" id="product-qty" class="qty-input" value="1" min="1">
                <button class="qty-btn" onclick="document.getElementById('product-qty').stepUp()">+</button>
              </div>
            <?php endif; ?>
            <button onclick="addToCartFromDetail('<?= $productJson ?>')"
                    class="inline-flex items-center justify-center gap-2 px-7 py-[13px] text-[14px] font-semibold tracking-[0.3px] rounded-full border-2 border-primary bg-primary text-white transition-all hover:bg-navy hover:border-navy hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(64,15,255,0.28)]">
              <iconify-icon icon="lucide:shopping-bag" width="16" height="16"></iconify-icon>
              Agregar al carrito
            </button>
          </div>
        <?php else: ?>
          <p class="inline-flex items-center gap-1 text-error text-base font-bold uppercase tracking-[0.3px]">
            <iconify-icon icon="lucide:x-circle" width="18" height="18"></iconify-icon>
            Sin stock
          </p>
        <?php endif; ?>

        <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>?text=<?= $waText ?>" target="_blank"
           class="inline-flex items-center justify-center gap-2 px-[18px] py-[9px] text-[12px] font-semibold tracking-[0.3px] rounded-full border-2 border-success bg-success text-white transition-all hover:bg-[#1EBE57] hover:border-[#1EBE57] hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(37,211,102,0.3)] w-fit">
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
