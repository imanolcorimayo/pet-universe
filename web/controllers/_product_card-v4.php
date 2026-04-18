<?php
// Expects $product. Compact card aligned with brand-rules variants 01–02.
// 01 Estándar → chip + cash lead + list reference
// 02 Oferta   → chip + oferta lead + cash tachado inline + list reference + "¡Oferta!" badge
//
// Dual-tracked products (sold loose per kg at the store) are rendered here as
// a regular unit card — the "per kg" option is surfaced only on the product
// detail page and handled via an order note. Keeps the grid uniform.
$inStock = !isset($product['inStock']) || $product['inStock'];

$cash    = $product['priceCash']    ?? 0;
$list    = $product['priceRegular'] ?? 0;
$oferta  = $product['priceOferta']  ?? 0;
$hasOferta = $oferta > 0 && $cash > 0 && $oferta < $cash;

$leadPrice   = $hasOferta ? $oferta : $cash;
$strikePrice = $hasOferta ? $cash   : 0;
$listRef     = $list;

$showListRef = $listRef > 0 && $listRef > $leadPrice;
$imgV = $product['imageUpdatedAt'] ?? 0;
?>
<a href="/producto/<?= htmlspecialchars($product['slug']) ?>"
   class="group h-full bg-white rounded-xl border border-hairline overflow-hidden flex flex-col transition-all hover:shadow-[0_8px_24px_rgba(32,28,78,0.09)] hover:border-primary/30 hover:-translate-y-0.5">

  <div class="relative aspect-square bg-canvas overflow-hidden">
    <?php if (!empty($product['hasImage'])): ?>
      <picture>
        <source type="image/avif" srcset="<?= productImageUrl($product['slug'], 'sm', 'avif') ?>?v=<?= $imgV ?>">
        <source type="image/webp" srcset="<?= productImageUrl($product['slug'], 'sm', 'webp') ?>?v=<?= $imgV ?>">
        <img src="<?= productImageUrl($product['slug'], 'sm', 'jpg') ?>?v=<?= $imgV ?>"
             alt="<?= htmlspecialchars($product['name']) ?>"
             loading="lazy" width="300" height="300"
             onerror="imgFallback(this)"
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]">
      </picture>
      <iconify-icon icon="lucide:package" width="42" height="42"
                    class="absolute inset-0 m-auto text-primary opacity-20"
                    style="display:none;"></iconify-icon>
    <?php else: ?>
      <div class="absolute inset-0 grid place-items-center">
        <iconify-icon icon="lucide:package" width="42" height="42" class="text-primary opacity-20"></iconify-icon>
      </div>
    <?php endif; ?>

    <?php if ($hasOferta): ?>
      <span class="absolute top-2 left-2 bg-teal text-navy text-[10px] font-extrabold tracking-[0.6px] uppercase px-2 py-[3px] rounded-md shadow-[0_3px_10px_rgba(0,206,206,0.32)] rotate-[-4deg]">¡Oferta!</span>
    <?php endif; ?>
    <?php if (!$inStock): ?>
      <span class="absolute inset-0 bg-white/85 grid place-items-center text-[11px] font-bold uppercase tracking-[1px] text-error">
        Sin stock
      </span>
    <?php endif; ?>
  </div>

  <div class="px-2.5 py-2.5 flex-1 flex flex-col gap-0.5">
    <span class="text-[12.5px] font-medium text-navy leading-[1.3] line-clamp-2 group-hover:text-primary transition-colors">
      <?= htmlspecialchars($product['name']) ?>
    </span>
    <?php if (!empty($product['brand'])): ?>
      <span class="text-[11px] text-muted leading-tight truncate"><?= htmlspecialchars($product['brand']) ?></span>
    <?php endif; ?>

    <div class="mt-auto pt-1.5 flex flex-col items-start gap-0.5">
      <span class="inline-block px-[6px] py-[1px] text-[9px] font-bold tracking-[0.4px] uppercase text-teal-deep bg-teal-wash rounded-full">Ef./Transf.</span>
      <div class="flex items-baseline gap-1.5 flex-wrap">
        <span class="text-[15px] font-bold text-navy leading-none">
          <?= formatPrice($leadPrice) ?>
        </span>
        <?php if ($strikePrice): ?>
          <span class="text-[11px] text-muted line-through leading-none"><?= formatPrice($strikePrice) ?></span>
        <?php endif; ?>
      </div>
      <?php if ($showListRef): ?>
        <span class="text-[10.5px] text-muted leading-none">Lista: <?= formatPrice($listRef) ?></span>
      <?php endif; ?>
    </div>
  </div>
</a>
