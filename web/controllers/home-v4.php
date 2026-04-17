<?php
$page_title = SITE_NAME . ' — ' . SITE_TAGLINE;

/**
 * Pool of recent in-stock products. We fetch a surplus so we can:
 *   1. extract real ofertas (cash discount) for the top rail
 *   2. populate the main grid without duplicating ofertas
 *
 * TODO: once ProductSchema exposes `hasCashDiscount` and `featured` flags and
 * they are indexed in Meili, replace the PHP-side filtering with proper
 * `filter` clauses (e.g. 'filter' => 'inStock = true AND hasCashDiscount = true')
 * and add a separate query for the Destacados rail.
 */
$pool = searchProducts('', [
    'limit'  => 60,
    'sort'   => ['updatedAt:desc'],
    'filter' => 'inStock = true',
]);
$poolHits = $pool['hits'] ?? [];

// TODO (mockup only): ProductSchema doesn't have priceOferta / priceKgOferta yet.
// Synthesize an oferta price for ~1/3 of the pool so variants 02 and 04 render.
// Keyed by id via crc32 so page refresh is stable. Remove when schema ships.
foreach ($poolHits as &$p) {
    $id = (string)($p['id'] ?? '');
    if ($id === '' || crc32($id) % 3 !== 0) continue;

    if (($p['trackingType'] ?? '') === 'dual') {
        if (!empty($p['priceKgCash'])) {
            $p['priceKgOferta'] = (int) round($p['priceKgCash'] * 0.85);
        }
        $bagBase = $p['priceCash'] ?? $p['priceRegular'] ?? 0;
        if ($bagBase) {
            $p['priceOferta'] = (int) round($bagBase * 0.85);
        }
    } elseif (!empty($p['priceCash'])) {
        $p['priceOferta'] = (int) round($p['priceCash'] * 0.85);
    }
}
unset($p);

$isOffer = function(array $p): bool {
    if (($p['trackingType'] ?? '') === 'dual') {
        return !empty($p['priceKgOferta']) && $p['priceKgOferta'] < ($p['priceKgCash'] ?? 0);
    }
    return !empty($p['priceOferta']) && $p['priceOferta'] < ($p['priceCash'] ?? 0);
};

$ofertas = [];
$ofertaIds = [];
foreach ($poolHits as $p) {
    if ($isOffer($p)) {
        $ofertas[] = $p;
        $ofertaIds[$p['id']] = true;
        if (count($ofertas) >= 12) break;
    }
}

// TODO: replace with real ProductSchema.featured flag once available.
// For now the rail is populated with non-oferta products from the pool, just
// so we can preview the layout alongside the Ofertas rail.
$destacados = [];
$destacadoIds = [];
foreach ($poolHits as $p) {
    if (isset($ofertaIds[$p['id']])) continue;
    $destacados[] = $p;
    $destacadoIds[$p['id']] = true;
    if (count($destacados) >= 12) break;
}

$productos = array_values(array_filter(
    $poolHits,
    fn($p) => !isset($ofertaIds[$p['id']]) && !isset($destacadoIds[$p['id']])
));
$productos = array_slice($productos, 0, 30);

require __DIR__ . '/../includes/header-v4.php';
?>

<!-- ─── Ofertas rail ─────────────────────────────────── -->
<?php if (!empty($ofertas)): ?>
<section class="pt-5 md:pt-7 pb-1">
  <div class="w-full max-w-[1280px] mx-auto px-3 md:px-5">
    <div class="flex items-end justify-between gap-4 mb-2.5 md:mb-3">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-error/10 text-error">
          <iconify-icon icon="lucide:tag" width="15" height="15"></iconify-icon>
        </span>
        <h2 class="font-display text-[18px] md:text-[22px] font-semibold text-navy leading-none">Ofertas</h2>
      </div>
      <a href="/productos?oferta=1"
         class="inline-flex items-center gap-1 text-[12.5px] md:text-[13.5px] font-semibold text-primary transition-colors hover:text-navy">
        Ver todas
        <iconify-icon icon="lucide:arrow-right" width="13" height="13"></iconify-icon>
      </a>
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
        <?php foreach ($ofertas as $product): ?>
          <div class="shrink-0 snap-start w-[44vw] sm:w-[30vw] md:w-[200px] lg:w-[204px]">
            <?php require __DIR__ . '/_product_card-v4.php'; ?>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- ─── Destacados rail (pending featured flag) ─────── -->
<?php if (!empty($destacados)): ?>
<section class="pt-4 md:pt-6 pb-1">
  <div class="w-full max-w-[1280px] mx-auto px-3 md:px-5">
    <div class="flex items-end justify-between gap-4 mb-2.5 md:mb-3">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-wash text-teal-deep">
          <iconify-icon icon="lucide:star" width="15" height="15"></iconify-icon>
        </span>
        <h2 class="font-display text-[18px] md:text-[22px] font-semibold text-navy leading-none">Más populares</h2>
      </div>
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
        <?php foreach ($destacados as $product): ?>
          <div class="shrink-0 snap-start w-[44vw] sm:w-[30vw] md:w-[200px] lg:w-[204px]">
            <?php require __DIR__ . '/_product_card-v4.php'; ?>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- ─── Productos grid ──────────────────────────────── -->
<?php if (!empty($productos)): ?>
<section class="py-5 md:py-8">
  <div class="w-full max-w-[1280px] mx-auto px-3 md:px-5">
    <div class="flex items-end justify-between gap-4 mb-2.5 md:mb-4">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-light text-primary">
          <iconify-icon icon="lucide:package" width="15" height="15"></iconify-icon>
        </span>
        <h2 class="font-display text-[18px] md:text-[22px] font-semibold text-navy leading-none">Productos</h2>
      </div>
      <a href="/productos"
         class="inline-flex items-center gap-1 text-[12.5px] md:text-[13.5px] font-semibold text-primary transition-colors hover:text-navy">
        Ver todos
        <iconify-icon icon="lucide:arrow-right" width="13" height="13"></iconify-icon>
      </a>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
      <?php foreach ($productos as $product): ?>
        <?php require __DIR__ . '/_product_card-v4.php'; ?>
      <?php endforeach; ?>
    </div>
    <div class="mt-7 md:mt-9 flex justify-center">
      <a href="/productos"
         class="inline-flex items-center justify-center gap-2 px-6 py-3 text-[14px] font-semibold tracking-[0.3px] rounded-full border-2 border-primary bg-white text-primary transition-all hover:bg-primary hover:text-white hover:-translate-y-px">
        Ver todos los productos
        <iconify-icon icon="lucide:arrow-right" width="16" height="16"></iconify-icon>
      </a>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- ─── Asesoramiento band ──────────────────────────── -->
<section class="py-8 md:py-12">
  <div class="w-full max-w-[1280px] mx-auto px-4 md:px-5">
    <div class="bg-white border border-hairline rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-8">
      <span class="shrink-0 inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-success/10 text-success">
        <iconify-icon icon="mdi:whatsapp" width="30" height="30"></iconify-icon>
      </span>
      <div class="flex-1">
        <h3 class="font-display text-[20px] md:text-[24px] font-semibold text-navy leading-tight mb-1.5">
          ¿Dudas? Te asesoramos por WhatsApp
        </h3>
        <p class="text-[14px] md:text-[15px] text-muted leading-relaxed max-w-[640px]">
          Como si estuvieras en el local. Si no sabés qué darle a tu mascota, escribinos y te ayudamos a elegir.
        </p>
      </div>
      <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener"
         class="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-success text-white font-semibold text-[14px] transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(37,211,102,0.35)]">
        <iconify-icon icon="mdi:whatsapp" width="18" height="18"></iconify-icon>
        Chatear ahora
      </a>
    </div>
  </div>
</section>

<!-- ─── Conocé el local ─────────────────────────────── -->
<section class="pb-12 md:pb-16">
  <div class="w-full max-w-[1280px] mx-auto px-4 md:px-5">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8 bg-white border border-hairline rounded-3xl overflow-hidden">
      <div class="relative aspect-[4/3] md:aspect-auto md:min-h-[320px]">
        <picture>
          <source type="image/webp"
                  srcset="<?= asset('img/hero/store-interior-sm.webp') ?> 800w, <?= asset('img/hero/store-interior.webp') ?> 1600w"
                  sizes="(max-width: 768px) 100vw, 640px">
          <img src="<?= asset('img/hero/store-interior.jpeg') ?>"
               alt="Interior del local Pet Universe en Luis Agote 1924, Córdoba"
               class="absolute inset-0 w-full h-full object-cover"
               loading="lazy"
               width="1600" height="900">
        </picture>
      </div>
      <div class="p-6 md:p-10 flex flex-col justify-center gap-4">
        <div>
          <div class="text-[11px] font-bold uppercase tracking-[2px] text-teal-deep mb-2">Pasá a vernos</div>
          <h3 class="font-display text-[24px] md:text-[30px] font-semibold text-navy leading-tight">
            Un pet shop de barrio en el corazón de Córdoba
          </h3>
        </div>
        <p class="text-[14px] md:text-[15px] text-muted leading-relaxed">
          Te atendemos personalmente: te ayudamos a elegir el alimento, los accesorios y todo lo que tu mascota necesita.
        </p>
        <div class="flex flex-col gap-2 pt-1">
          <span class="inline-flex items-center gap-2.5 text-[14px] text-navy">
            <iconify-icon icon="lucide:map-pin" width="16" height="16" class="text-primary"></iconify-icon>
            <?= STORE_ADDRESS ?>
          </span>
          <span class="inline-flex items-center gap-2.5 text-[14px] text-navy">
            <iconify-icon icon="lucide:clock" width="16" height="16" class="text-primary"></iconify-icon>
            Lun a Sáb · 9 a 20
          </span>
          <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener"
             class="inline-flex items-center gap-2.5 text-[14px] text-navy transition-colors hover:text-success">
            <iconify-icon icon="mdi:whatsapp" width="16" height="16" class="text-success"></iconify-icon>
            +54 9 351 760 5708
          </a>
        </div>
        <div class="flex gap-2 pt-2">
          <a href="<?= STORE_INSTAGRAM_URL ?>" target="_blank" rel="noopener" aria-label="Instagram"
             class="w-10 h-10 rounded-full bg-primary-light text-primary inline-flex items-center justify-center transition-colors hover:bg-primary hover:text-white">
            <iconify-icon icon="lucide:instagram" width="18" height="18"></iconify-icon>
          </a>
          <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener" aria-label="WhatsApp"
             class="w-10 h-10 rounded-full bg-success/10 text-success inline-flex items-center justify-center transition-colors hover:bg-success hover:text-white">
            <iconify-icon icon="mdi:whatsapp" width="18" height="18"></iconify-icon>
          </a>
        </div>
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

<?php require __DIR__ . '/../includes/footer-v4.php'; ?>
