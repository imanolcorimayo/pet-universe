<?php
// $slug is set by the router (index.php)
$product = getProductBySlug($slug);

if (!$product) {
    http_response_code(404);
    $isNoindex = true;
    require __DIR__ . '/404.php';
    return;
}

$page_title = htmlspecialchars($product['name']) . ' — ' . SITE_NAME;
$page_description = trim(($product['brand'] ?? '') . ' ' . $product['name'] . '. ' . ($product['description'] ?? ''));

$isDual       = ($product['trackingType'] ?? '') === 'dual';
$priceRegular = (int)($product['priceRegular'] ?? 0);
$priceCash    = (int)($product['priceCash']    ?? 0);
$priceOferta  = (int)($product['priceOferta']  ?? 0);
$hasOferta    = $priceOferta > 0 && $priceCash > 0 && $priceOferta < $priceCash;
$leadPrice    = $hasOferta ? $priceOferta : $priceCash;
$strikePrice  = $hasOferta ? $priceCash   : 0;
$unitWeight   = (float)($product['unitWeight'] ?? 0);
$inStock      = !isset($product['inStock']) || $product['inStock'];

// Resolve category record (for breadcrumb link + related rail).
$productCategory = null;
if (!empty($product['category'])) {
    foreach (getCategories() as $cat) {
        if (($cat['id'] ?? null) === $product['category']) {
            $productCategory = $cat;
            break;
        }
    }
}

// Related products from the same category, excluding current item.
$relatedProducts = [];
if (!empty($product['category'])) {
    $relatedRaw = searchProducts('', [
        'limit'  => 14,
        'filter' => 'category = "' . addslashes($product['category']) . '" AND inStock = true',
        'sort'   => ['updatedAt:desc'],
    ]);
    $relatedProducts = array_values(array_filter(
        $relatedRaw['hits'] ?? [],
        fn($p) => ($p['slug'] ?? '') !== ($product['slug'] ?? '')
    ));
    $relatedProducts = array_slice($relatedProducts, 0, 10);
}

$productJson = htmlspecialchars(json_encode([
    'id'             => $product['id'],
    'slug'           => $product['slug'],
    'name'           => $product['name'],
    'brand'          => $product['brand'] ?? '',
    'priceRegular'   => $priceRegular,
    'priceCash'      => $priceCash,
    'priceOferta'    => $priceOferta,
    'trackingType'   => $product['trackingType'] ?? 'unit',
    'unitWeight'     => $unitWeight,
    'hasImage'       => !empty($product['hasImage']),
    'imageUpdatedAt' => $product['imageUpdatedAt'] ?? 0,
]), ENT_QUOTES, 'UTF-8');

$waText = urlencode("Hola! Quiero consultar por: " . $product['name']);
$imgV = $product['imageUpdatedAt'] ?? 0;
$page_og_image = !empty($product['hasImage']) ? productImageUrl($product['slug'], 'lg', 'jpg') . '?v=' . $imgV : null;

require __DIR__ . '/../includes/header.php';
?>

<section class="py-5 md:py-8">
  <div class="w-full max-w-[1280px] mx-auto px-3 md:px-5">

    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-[12.5px] text-muted mb-3 md:mb-5 flex-wrap">
      <a href="/" class="text-muted transition-colors hover:text-primary">Inicio</a>
      <iconify-icon icon="lucide:chevron-right" width="13" height="13" class="opacity-40"></iconify-icon>
      <a href="/productos" class="text-muted transition-colors hover:text-primary">Productos</a>
      <?php if ($productCategory): ?>
        <iconify-icon icon="lucide:chevron-right" width="13" height="13" class="opacity-40"></iconify-icon>
        <a href="/productos?categoria=<?= urlencode($productCategory['slug']) ?>"
           class="text-muted transition-colors hover:text-primary">
          <?= htmlspecialchars($productCategory['name']) ?>
        </a>
      <?php endif; ?>
      <iconify-icon icon="lucide:chevron-right" width="13" height="13" class="opacity-40"></iconify-icon>
      <span class="text-navy truncate max-w-[240px] md:max-w-none"><?= htmlspecialchars($product['name']) ?></span>
    </nav>

    <!-- ─── Gallery + buy card ──────────────────────── -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-10 items-start">

      <div class="aspect-square bg-gradient-to-br from-primary-light to-[#F2EDE6] rounded-[20px] flex items-center justify-center overflow-hidden relative">
        <?php if ($hasOferta): ?>
          <span class="absolute top-4 left-4 bg-teal text-navy text-[11px] font-extrabold tracking-[0.8px] uppercase px-3 py-[5px] rounded-md shadow-[0_4px_12px_rgba(0,206,206,0.32)] rotate-[-4deg] z-10">¡Oferta!</span>
        <?php endif; ?>
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
        <?php if (!$inStock): ?>
          <span class="absolute inset-0 bg-white/85 grid place-items-center text-[14px] font-bold uppercase tracking-[1.5px] text-error">Sin stock</span>
        <?php endif; ?>
      </div>

      <div class="flex flex-col gap-4">
        <?php if ($productCategory): ?>
          <a href="/productos?categoria=<?= urlencode($productCategory['slug']) ?>"
             class="inline-flex text-[11px] font-bold uppercase tracking-[0.6px] text-primary bg-primary-light px-3 py-1 rounded-full w-fit transition-colors hover:bg-primary hover:text-white">
            <?= htmlspecialchars($productCategory['name']) ?>
          </a>
        <?php endif; ?>

        <h1 class="font-display text-[1.5rem] md:text-[2rem] font-semibold leading-[1.2] text-navy"><?= htmlspecialchars($product['name']) ?></h1>

        <?php if (!empty($product['brand'])): ?>
          <span class="text-[14px] text-muted -mt-2"><?= htmlspecialchars($product['brand']) ?></span>
        <?php endif; ?>

        <div class="flex flex-col gap-1.5">
          <span class="inline-block px-[10px] py-[4px] text-[11px] font-bold tracking-[0.6px] uppercase text-teal-deep bg-teal-wash rounded-full w-fit">Efectivo o transferencia</span>
          <div class="flex items-baseline gap-3 flex-wrap">
            <span class="font-bold text-[1.75rem] md:text-[2.25rem] text-navy leading-[1.1]"><?= formatPrice($leadPrice) ?></span>
            <?php if ($strikePrice): ?>
              <span class="text-[1rem] text-muted line-through font-medium"><?= formatPrice($strikePrice) ?></span>
            <?php endif; ?>
          </div>
          <?php if ($priceRegular > $leadPrice): ?>
            <span class="text-[13px] text-muted font-medium">Precio de lista: <?= formatPrice($priceRegular) ?></span>
          <?php endif; ?>
          <?php if ($isDual && $unitWeight > 0): ?>
            <span class="text-[13px] text-muted font-medium">
              Bolsa cerrada de <?= rtrim(rtrim(number_format($unitWeight, 2, ',', ''), '0'), ',') ?>kg
            </span>
          <?php endif; ?>
        </div>

        <?php if ($isDual): ?>
          <div class="flex gap-3 items-start p-4 rounded-xl bg-teal-wash border border-teal/20">
            <iconify-icon icon="lucide:info" width="20" height="20" class="text-teal-deep shrink-0 mt-0.5"></iconify-icon>
            <div class="flex-1 text-[13px] text-navy leading-[1.55]">
              <strong class="font-semibold">También se vende suelto por kg</strong> en el local.
              Si preferís llevar una cantidad distinta a la bolsa cerrada, agregala en las notas
              y lo coordinamos por WhatsApp.
            </div>
          </div>
        <?php endif; ?>

        <?php if ($inStock): ?>
          <div class="flex flex-col gap-3">
            <label class="flex flex-col gap-1.5">
              <span class="text-[12px] font-semibold text-navy">
                Notas para el pedido <span class="text-muted font-normal">(opcional)</span>
              </span>
              <textarea id="product-notes" rows="2"
                        placeholder="<?= $isDual
                          ? 'Ej.: quiero 3 kg sueltos en vez de la bolsa cerrada'
                          : 'Indicaciones especiales, sabor, tamaño…' ?>"
                        class="w-full py-2.5 px-3 border border-hairline rounded-xl text-[14px] transition-all outline-none bg-white resize-y min-h-[60px] focus:border-primary focus:shadow-[0_0_0_3px_rgba(64,15,255,0.1)]"></textarea>
            </label>

            <div class="flex gap-3 items-center flex-wrap">
              <div class="qty-selector">
                <button class="qty-btn" onclick="document.getElementById('product-qty').stepDown()">-</button>
                <input type="number" id="product-qty" class="qty-input" value="1" min="1">
                <button class="qty-btn" onclick="document.getElementById('product-qty').stepUp()">+</button>
              </div>
              <button onclick="addToCartFromDetail('<?= $productJson ?>')"
                      class="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-7 py-[13px] text-[14px] font-semibold tracking-[0.3px] rounded-full border-2 border-primary bg-primary text-white transition-all hover:bg-navy hover:border-navy hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(64,15,255,0.28)]">
                <iconify-icon icon="lucide:shopping-bag" width="16" height="16"></iconify-icon>
                Agregar al carrito
              </button>
            </div>
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

        <!-- Trust badges -->
        <div class="mt-1 grid grid-cols-3 gap-3 p-4 rounded-2xl bg-canvas border border-hairline">
          <div class="text-center">
            <iconify-icon icon="lucide:truck" width="22" class="text-primary"></iconify-icon>
            <div class="text-[11.5px] font-semibold text-navy mt-1">Envíos en Córdoba</div>
          </div>
          <div class="text-center">
            <iconify-icon icon="lucide:shield-check" width="22" class="text-primary"></iconify-icon>
            <div class="text-[11.5px] font-semibold text-navy mt-1">Producto original</div>
          </div>
          <div class="text-center">
            <iconify-icon icon="lucide:repeat" width="22" class="text-primary"></iconify-icon>
            <div class="text-[11.5px] font-semibold text-navy mt-1">Cambios sin vueltas</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Description ───────────────────────────── -->
    <?php if (!empty($product['description'])): ?>
    <section class="mt-10 md:mt-14 max-w-[860px]">
      <h3 class="text-[11px] font-bold tracking-[2px] uppercase text-primary mb-2">Descripción</h3>
      <p class="text-[14.5px] text-navy/80 leading-[1.7] whitespace-pre-line">
        <?= htmlspecialchars($product['description']) ?>
      </p>
    </section>
    <?php endif; ?>

  </div>
</section>

<!-- ─── Te puede interesar (related products rail) ──── -->
<?php if (!empty($relatedProducts)): ?>
<section class="pb-10 md:pb-14">
  <div class="w-full max-w-[1280px] mx-auto px-3 md:px-5">
    <div class="flex items-end justify-between gap-4 mb-2.5 md:mb-3">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-wash text-teal-deep">
          <iconify-icon icon="lucide:sparkles" width="15" height="15"></iconify-icon>
        </span>
        <h2 class="font-display text-[18px] md:text-[22px] font-semibold text-navy leading-none">Te puede interesar</h2>
      </div>
      <?php if ($productCategory): ?>
        <a href="/productos?categoria=<?= urlencode($productCategory['slug']) ?>"
           class="inline-flex items-center gap-1 text-[12.5px] md:text-[13.5px] font-semibold text-primary transition-colors hover:text-navy">
          Ver más
          <iconify-icon icon="lucide:arrow-right" width="13" height="13"></iconify-icon>
        </a>
      <?php endif; ?>
    </div>
    <div class="rail-container relative">
      <button type="button" data-rail-btn="prev" aria-label="Anterior"
              class="hidden md:flex absolute left-1 top-[40%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white text-navy shadow-[0_6px_18px_rgba(32,28,78,0.18)] items-center justify-center transition-all hover:bg-navy hover:text-white hover:scale-105 opacity-0 pointer-events-none">
        <iconify-icon icon="lucide:chevron-left" width="20" height="20"></iconify-icon>
      </button>
      <button type="button" data-rail-btn="next" aria-label="Siguiente"
              class="hidden md:flex absolute right-1 top-[40%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white text-navy shadow-[0_6px_18px_rgba(32,28,78,0.18)] items-center justify-center transition-all hover:bg-navy hover:text-white hover:scale-105">
        <iconify-icon icon="lucide:chevron-right" width="20" height="20"></iconify-icon>
      </button>
      <div class="rail-scroll scroll-row flex gap-2 md:gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth">
        <?php foreach ($relatedProducts as $product): ?>
          <div class="shrink-0 snap-start w-[44vw] sm:w-[30vw] md:w-[200px] lg:w-[204px]">
            <?php require __DIR__ . '/_product_card.php'; ?>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</section>

<script>
(function () {
  document.querySelectorAll('.rail-container').forEach(function (container) {
    var scroll = container.querySelector('.rail-scroll');
    var prev   = container.querySelector('[data-rail-btn="prev"]');
    var next   = container.querySelector('[data-rail-btn="next"]');
    if (!scroll) return;
    var step = function () { return Math.max(180, Math.round(scroll.clientWidth * 0.8)); };
    if (prev) prev.addEventListener('click', function () { scroll.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { scroll.scrollBy({ left:  step(), behavior: 'smooth' }); });
    var update = function () {
      var atStart = scroll.scrollLeft <= 2;
      var atEnd   = scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 2;
      if (prev) {
        prev.classList.toggle('opacity-0', atStart);
        prev.classList.toggle('pointer-events-none', atStart);
      }
      if (next) {
        next.classList.toggle('opacity-0', atEnd);
        next.classList.toggle('pointer-events-none', atEnd);
      }
    };
    scroll.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();
</script>
<?php endif; ?>

<?php require __DIR__ . '/../includes/footer.php'; ?>

<script>
  function addToCartFromDetail(productJson) {
    var product = typeof productJson === 'string' ? JSON.parse(productJson) : productJson;
    var qty = parseInt(document.getElementById('product-qty').value) || 1;
    var notes = (document.getElementById('product-notes')?.value || '').trim();
    cart.addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      priceRegular: product.priceRegular,
      priceCash: product.priceCash,
      priceOferta: product.priceOferta,
      hasImage: product.hasImage,
      imageUpdatedAt: product.imageUpdatedAt,
      notes: notes,
    }, qty);
    bumpCartBadge();
  }

  function bumpCartBadge() {
    document.querySelectorAll('[id^="cart-badge"]').forEach(function (badge) {
      badge.style.transform = 'scale(1.3)';
      setTimeout(function () { badge.style.transform = ''; }, 200);
    });
  }
</script>
