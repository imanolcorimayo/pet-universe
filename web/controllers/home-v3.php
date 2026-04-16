<?php
$page_title = SITE_NAME . ' — ' . SITE_TAGLINE;

$categories = getCategories();

$featured = searchProducts('', [
    'limit' => 8,
    'sort' => ['updatedAt:desc'],
    'filter' => 'inStock = true',
]);

require __DIR__ . '/../includes/header-v3.php';
?>

<!-- ─── HERO: category sidebar + big photo ───────────── -->
<section class="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
  <div class="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 sm:gap-4">

    <!-- Permanent category sidebar (desktop only) -->
    <?php if (!empty($categories)): ?>
    <aside class="hidden lg:block bg-purple-wash rounded-3xl p-3 h-[460px] overflow-y-auto">
      <?php foreach ($categories as $cat): ?>
      <a href="/productos?categoria=<?= urlencode($cat['slug']) ?>"
         class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl hover:bg-paper group transition-colors">
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-9 h-9 rounded-xl bg-paper grid place-items-center shrink-0 text-purple-deep group-hover:bg-purple group-hover:text-paper transition-colors">
            <iconify-icon icon="<?= getCategoryIcon($cat['name']) ?>" width="18" height="18"></iconify-icon>
          </span>
          <span class="font-chunky font-semibold text-[14px] text-ink truncate"><?= htmlspecialchars($cat['name']) ?></span>
        </div>
        <iconify-icon icon="lucide:chevron-right" width="14" height="14" class="text-ink-muted shrink-0 group-hover:text-purple-deep"></iconify-icon>
      </a>
      <?php endforeach; ?>
    </aside>
    <?php endif; ?>

    <!-- Hero photo with overlays -->
    <div class="relative rounded-3xl overflow-hidden bg-purple-wash aspect-[16/10] lg:aspect-auto lg:h-[460px]">
      <img src="<?= asset('img/hero/store-interior.jpeg') ?>"
           alt="Pet Universe — Luis Agote 1924, Córdoba"
           class="w-full h-full object-cover"
           fetchpriority="high">

      <!-- Subtle dark gradient for text contrast -->
      <div class="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent"></div>

      <!-- Hero headline card (bottom-left) -->
      <div class="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 bg-paper/95 backdrop-blur rounded-2xl px-5 py-4 max-w-[78%] sm:max-w-[380px] shadow-[0_20px_40px_-15px_rgba(26,6,80,0.4)]">
        <div class="text-[11px] font-chunky font-bold tracking-[2px] uppercase text-purple-deep mb-1">Pet shop de barrio</div>
        <div class="font-chunky text-[22px] sm:text-[28px] font-extrabold text-ink leading-[1.1]">
          Todo para tu mascota,<br>con el consejo de siempre.
        </div>
        <div class="mt-3 flex items-center gap-1.5 text-[12px] text-ink-muted font-medium">
          <iconify-icon icon="lucide:map-pin" width="13" height="13" class="text-purple"></iconify-icon>
          Luis Agote 1924, Córdoba
        </div>
      </div>

      <!-- Sticker chip bottom-right (desktop only) -->
      <div class="hidden sm:flex absolute bottom-6 right-6 items-center gap-2 bg-yellow rounded-full px-4 py-2.5 shadow-[0_10px_24px_-6px_rgba(235,193,22,0.5)]">
        <iconify-icon icon="mdi:paw" width="18" height="18" class="text-ink"></iconify-icon>
        <span class="font-chunky font-bold text-[13px] text-ink">Atendemos personalmente</span>
      </div>
    </div>
  </div>
</section>

<!-- ─── POPULAR CATEGORIES — photo-style cards ──────── -->
<?php if (!empty($categories)): ?>
<section id="categorias" class="px-4 sm:px-6 lg:px-8 pb-10">
  <div class="flex items-center gap-3 mb-5 sm:mb-6">
    <span class="w-9 h-9 rounded-full bg-yellow grid place-items-center">
      <iconify-icon icon="lucide:star" width="18" height="18" class="text-ink"></iconify-icon>
    </span>
    <h2 class="font-chunky font-extrabold text-[24px] sm:text-[30px] text-ink leading-none">Categorías populares</h2>
  </div>

  <?php
  // Rotate vibrant backgrounds for visual rhythm
  $cardPalette = [
    ['bg-purple',    'text-paper'],
    ['bg-yellow',    'text-ink'],
    ['bg-rust',      'text-paper'],
    ['bg-teal-deep', 'text-paper'],
    ['bg-navy',      'text-paper'],
  ];
  $topCats = array_slice($categories, 0, 5);
  ?>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
    <?php foreach ($topCats as $i => $cat):
      [$bg, $txt] = $cardPalette[$i % count($cardPalette)];
    ?>
    <a href="/productos?categoria=<?= urlencode($cat['slug']) ?>"
       class="group relative aspect-square rounded-3xl overflow-hidden <?= $bg ?> <?= $txt ?> p-5 flex items-end transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(26,6,80,0.35)]">
      <!-- Big icon floating top-right -->
      <div class="absolute -top-2 -right-2 opacity-90 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
        <iconify-icon icon="<?= getCategoryIcon($cat['name']) ?>" width="104" height="104"></iconify-icon>
      </div>
      <!-- Chip label -->
      <span class="relative z-10 bg-paper text-ink font-chunky font-bold text-[12px] sm:text-[13px] rounded-full px-3.5 py-1.5 shadow-sm">
        <?= htmlspecialchars($cat['name']) ?>
      </span>
    </a>
    <?php endforeach; ?>
  </div>

  <div class="flex justify-center mt-6">
    <a href="/productos" class="inline-flex items-center gap-1.5 text-purple-deep font-chunky font-bold text-[14px] hover:underline">
      Ver todas las categorías
      <iconify-icon icon="lucide:chevron-down" width="14" height="14"></iconify-icon>
    </a>
  </div>
</section>
<?php endif; ?>

<!-- ─── BEST SELLERS ─────────────────────────────────── -->
<?php if (!empty($featured['hits'])): ?>
<section id="bestsellers" class="mx-4 sm:mx-6 lg:mx-8 mb-8 bg-purple-wash rounded-[28px] p-5 sm:p-8">
  <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
    <div class="flex items-center gap-3">
      <span class="w-9 h-9 rounded-full bg-yellow grid place-items-center">
        <iconify-icon icon="lucide:flame" width="18" height="18" class="text-ink"></iconify-icon>
      </span>
      <h2 class="font-chunky font-extrabold text-[24px] sm:text-[30px] text-ink leading-none">Hits de ventas</h2>
    </div>
    <a href="/productos" class="inline-flex items-center gap-1.5 text-purple-deep font-chunky font-bold text-[14px] hover:underline">
      Ver todos
      <iconify-icon icon="lucide:arrow-right" width="14" height="14"></iconify-icon>
    </a>
  </div>

  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
    <?php foreach ($featured['hits'] as $product): ?>
      <?php require __DIR__ . '/_product_card-v3.php'; ?>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<!-- ─── WHATSAPP CTA BAND ───────────────────────────── -->
<section id="ofertas" class="mx-4 sm:mx-6 lg:mx-8 mb-8">
  <div class="relative bg-purple text-paper rounded-[28px] overflow-hidden p-7 sm:p-12">
    <div class="absolute -top-8 -right-8 text-yellow/25 pointer-events-none" aria-hidden="true">
      <iconify-icon icon="mdi:paw" width="220" height="220"></iconify-icon>
    </div>
    <div class="absolute -bottom-10 left-16 text-paper/10 pointer-events-none" aria-hidden="true">
      <iconify-icon icon="mdi:dog-side" width="180" height="180"></iconify-icon>
    </div>

    <div class="relative grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8 items-center">
      <div>
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow text-ink text-[11px] font-chunky font-bold tracking-[1px] uppercase">
          <iconify-icon icon="mdi:whatsapp" width="12" height="12"></iconify-icon>
          WhatsApp abierto
        </span>
        <h2 class="mt-3 font-chunky font-extrabold text-[30px] sm:text-[40px] leading-[1.05]">
          ¿No sabés qué darle<br>a tu mascota?
        </h2>
        <p class="mt-3 text-paper/85 text-[15px] sm:text-[16px] leading-relaxed max-w-[520px]">
          Contanos qué tenés en casa y te recomendamos sin compromiso. Atendemos personalmente de lunes a sábado.
        </p>
      </div>
      <div class="flex md:justify-end">
        <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener"
           class="inline-flex items-center gap-2 bg-yellow text-ink font-chunky font-extrabold rounded-full px-7 py-4 text-[16px] hover:bg-paper transition-colors shadow-[0_12px_30px_-8px_rgba(255,217,61,0.6)]">
          <iconify-icon icon="mdi:whatsapp" width="22" height="22"></iconify-icon>
          Consultanos ya
        </a>
      </div>
    </div>
  </div>
</section>

<?php require __DIR__ . '/../includes/footer-v3.php'; ?>
