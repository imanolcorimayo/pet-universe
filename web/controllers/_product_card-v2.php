<?php
// Expects $product variable
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

$inStock = !isset($product['inStock']) || $product['inStock'];
$hasCashDiscount = !$isDual && !empty($product['priceCash']) && $product['priceCash'] < $product['priceRegular'];
?>
<div class="group relative bg-paper rounded-2xl border border-ink/10 overflow-hidden flex flex-col lift-on-hover">
  <a href="/producto/<?= htmlspecialchars($product['slug']) ?>" class="block relative aspect-square overflow-hidden bg-paper-deep">
    <?php $imgV = $product['imageUpdatedAt'] ?? 0; ?>
    <?php if (!empty($product['hasImage'])): ?>
      <picture>
        <source type="image/avif" srcset="<?= productImageUrl($product['slug'], 'sm', 'avif') ?>?v=<?= $imgV ?>">
        <source type="image/webp" srcset="<?= productImageUrl($product['slug'], 'sm', 'webp') ?>?v=<?= $imgV ?>">
        <img src="<?= productImageUrl($product['slug'], 'sm', 'jpg') ?>?v=<?= $imgV ?>"
             alt="<?= htmlspecialchars($product['name']) ?>"
             loading="lazy" width="300" height="300"
             onerror="imgFallback(this)"
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
      </picture>
      <iconify-icon icon="lucide:package" width="48" height="48" class="absolute inset-0 m-auto text-ink/15" style="display:none;"></iconify-icon>
    <?php else: ?>
      <div class="absolute inset-0 grid place-items-center">
        <iconify-icon icon="lucide:package" width="48" height="48" class="text-ink/15"></iconify-icon>
      </div>
    <?php endif; ?>

    <?php if ($hasCashDiscount): ?>
      <span class="sticker sticker-tilt-1 absolute top-3 left-3 bg-rust text-paper font-hand text-lg leading-none px-3 py-1.5 rounded-md shadow-sm">
        efectivo
      </span>
    <?php endif; ?>
    <?php if (!$inStock): ?>
      <span class="absolute inset-0 bg-paper/80 grid place-items-center">
        <span class="text-[11px] font-semibold tracking-[2px] uppercase text-rust">Sin stock</span>
      </span>
    <?php endif; ?>
  </a>

  <div class="flex-1 p-4 flex flex-col gap-1.5">
    <span class="text-[10px] font-semibold tracking-[1.5px] uppercase text-teal-deep">
      <?= htmlspecialchars($product['categoryName'] ?? '') ?>
    </span>
    <a href="/producto/<?= htmlspecialchars($product['slug']) ?>"
       class="font-display font-semibold text-[15px] text-ink leading-snug line-clamp-2 hover:text-rust transition-colors">
      <?= htmlspecialchars($product['name']) ?>
    </a>
    <?php if (!empty($product['brand'])): ?>
      <span class="text-[12px] text-ink-muted"><?= htmlspecialchars($product['brand']) ?></span>
    <?php endif; ?>

    <?php if ($isDual && !empty($product['priceKgRegular'])): ?>
      <div class="mt-auto pt-2">
        <div class="font-display font-bold text-[18px] text-ink leading-none">
          <?= formatPrice($product['priceKgRegular']) ?><span class="text-[11px] font-medium text-ink-muted">/kg</span>
        </div>
        <div class="text-[11px] text-ink-muted mt-1">Bolsa <?= $product['unitWeight'] ?>kg: <?= formatPrice($product['priceRegular']) ?></div>
      </div>
    <?php else: ?>
      <div class="mt-auto pt-2">
        <div class="font-display font-bold text-[18px] text-ink leading-none"><?= formatPrice($product['priceRegular']) ?></div>
        <?php if ($hasCashDiscount): ?>
          <div class="text-[11px] text-rust font-semibold mt-1">Efectivo: <?= formatPrice($product['priceCash']) ?></div>
        <?php endif; ?>
      </div>
    <?php endif; ?>
  </div>

  <?php if ($inStock): ?>
  <div class="px-4 pb-4">
    <button onclick="addToCart('<?= $productJson ?>')"
            class="w-full inline-flex items-center justify-center gap-1.5 bg-ink text-paper hover:bg-rust transition-colors rounded-full py-2.5 text-[13px] font-semibold">
      <iconify-icon icon="lucide:shopping-bag" width="14" height="14"></iconify-icon>
      Agregar
    </button>
  </div>
  <?php endif; ?>
</div>
