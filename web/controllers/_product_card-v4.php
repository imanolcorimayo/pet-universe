<?php
// Expects $product variable to be set
$isDual = ($product['trackingType'] ?? '') === 'dual';
$inStock = !isset($product['inStock']) || $product['inStock'];

if ($isDual) {
  $hasCashDiscount = !empty($product['priceKgCash']) && $product['priceKgCash'] < ($product['priceKgRegular'] ?? 0);
} else {
  $hasCashDiscount = !empty($product['priceCash']) && $product['priceCash'] < ($product['priceRegular'] ?? 0);
}

if (!isset($GLOBALS['_offerBadgesShown'])) $GLOBALS['_offerBadgesShown'] = 0;
$showOfferBadge = $hasCashDiscount && $GLOBALS['_offerBadgesShown'] < 3;
if ($showOfferBadge) $GLOBALS['_offerBadgesShown']++;

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
<div class="group bg-white rounded-2xl border border-hairline overflow-hidden flex flex-col transition-all hover:shadow-[0_12px_40px_rgba(32,28,78,0.10)] hover:border-transparent hover:-translate-y-0.5">
  <a href="/producto/<?= htmlspecialchars($product['slug']) ?>"
     class="aspect-square bg-canvas flex items-center justify-center overflow-hidden relative">
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
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          onerror="imgFallback(this)"
        >
      </picture>
      <iconify-icon icon="lucide:package" width="52" height="52"
                    class="text-primary opacity-20 transition-all duration-500 group-hover:opacity-30 group-hover:scale-110"
                    style="display:none;"></iconify-icon>
    <?php else: ?>
      <iconify-icon icon="lucide:package" width="52" height="52"
                    class="text-primary opacity-20 transition-all duration-500 group-hover:opacity-30 group-hover:scale-110"></iconify-icon>
    <?php endif; ?>

    <?php if ($showOfferBadge): ?>
      <span class="absolute top-2.5 left-2.5 z-[2] bg-error text-white text-[11px] font-extrabold tracking-[0.4px] uppercase px-2.5 py-1 rounded-full pointer-events-none">Oferta</span>
    <?php endif; ?>
  </a>

  <div class="px-4 py-4 flex-1 flex flex-col gap-1.5">
    <span class="inline-flex text-[10px] font-bold uppercase tracking-[0.6px] text-primary bg-primary-light px-2 py-[3px] rounded-full w-fit">
      <?= htmlspecialchars($product['categoryName'] ?? '') ?>
    </span>
    <a href="/producto/<?= htmlspecialchars($product['slug']) ?>"
       class="text-[14px] font-semibold text-navy leading-[1.35] line-clamp-2 transition-colors hover:text-primary">
      <?= htmlspecialchars($product['name']) ?>
    </a>
    <?php if (!empty($product['brand'])): ?>
      <span class="text-[12px] text-muted"><?= htmlspecialchars($product['brand']) ?></span>
    <?php endif; ?>

    <?php if ($isDual && !empty($product['priceKgRegular'])): ?>
      <div class="mt-auto pt-2 flex flex-col items-start gap-0.5">
        <?php if ($hasCashDiscount): ?>
          <span class="inline-block px-[9px] py-[3px] text-[10px] font-bold tracking-[0.6px] uppercase text-teal-deep bg-teal-wash rounded-full mb-0.5">Efectivo o transferencia</span>
          <span class="text-[18px] font-bold text-navy leading-[1.1]"><?= formatPrice($product['priceKgCash']) ?><span class="text-[0.55em] font-medium text-muted">/kg</span></span>
          <span class="text-[12px] text-muted font-medium mt-[3px]">Precio de lista: <?= formatPrice($product['priceKgRegular']) ?>/kg</span>
          <span class="text-[12px] text-muted font-medium mt-[3px]">Bolsa <?= $product['unitWeight'] ?>kg: <?= formatPrice($product['priceCash'] ?? $product['priceRegular']) ?></span>
        <?php else: ?>
          <span class="text-[18px] font-bold text-navy leading-[1.1]"><?= formatPrice($product['priceKgRegular']) ?><span class="text-[0.55em] font-medium text-muted">/kg</span></span>
          <span class="text-[12px] text-muted font-medium mt-[3px]">Bolsa <?= $product['unitWeight'] ?>kg: <?= formatPrice($product['priceRegular']) ?></span>
        <?php endif; ?>
      </div>
    <?php else: ?>
      <div class="mt-auto pt-2 flex flex-col items-start gap-0.5">
        <?php if ($hasCashDiscount): ?>
          <span class="inline-block px-[9px] py-[3px] text-[10px] font-bold tracking-[0.6px] uppercase text-teal-deep bg-teal-wash rounded-full mb-0.5">Efectivo o transferencia</span>
          <span class="text-[18px] font-bold text-navy leading-[1.1]"><?= formatPrice($product['priceCash']) ?></span>
          <span class="text-[12px] text-muted font-medium mt-[3px]">Precio de lista: <?= formatPrice($product['priceRegular']) ?></span>
        <?php else: ?>
          <span class="text-[18px] font-bold text-navy leading-[1.1]"><?= formatPrice($product['priceRegular']) ?></span>
        <?php endif; ?>
      </div>
    <?php endif; ?>

    <?php if (!$inStock): ?>
      <span class="inline-flex items-center gap-1 text-error text-[12px] font-bold uppercase tracking-[0.3px]">
        <iconify-icon icon="lucide:x-circle" width="14" height="14"></iconify-icon>
        Sin stock
      </span>
    <?php endif; ?>
  </div>

  <?php if ($inStock): ?>
  <div class="px-4 pb-4">
    <button onclick="addToCart('<?= $productJson ?>')"
            class="w-full inline-flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold tracking-[0.3px] rounded-full border-2 border-primary bg-primary text-white transition-all hover:bg-navy hover:border-navy hover:-translate-y-px">
      <iconify-icon icon="lucide:shopping-bag" width="14" height="14"></iconify-icon>
      Agregar al carrito
    </button>
  </div>
  <?php endif; ?>
</div>
