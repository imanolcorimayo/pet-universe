<?php
$page_title = SITE_NAME . ' — ' . SITE_TAGLINE;

// Ofertas showcase — static for now, just pick up to 8 products and let the
// card's internal hasCashDiscount logic surface the "Oferta" badge where real.
$ofertas = searchProducts('', [
    'limit' => 8,
    'sort' => ['updatedAt:desc'],
    'filter' => 'inStock = true',
]);

// Main product grid — first 24 most-recently-updated, in-stock.
$productos = searchProducts('', [
    'limit' => 24,
    'sort' => ['updatedAt:desc'],
    'filter' => 'inStock = true',
]);

require __DIR__ . '/../includes/header-v4.php';
?>

<!-- ─── Ofertas showcase ─────────────────────────────── -->
<?php if (!empty($ofertas['hits'])): ?>
<section class="pt-6 md:pt-8 pb-2">
  <div class="w-full max-w-[1280px] mx-auto px-4 md:px-5">
    <div class="flex items-end justify-between gap-4 mb-3 md:mb-4">
      <div class="flex items-center gap-2.5">
        <span class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-error/10 text-error">
          <iconify-icon icon="lucide:tag" width="18" height="18"></iconify-icon>
        </span>
        <h2 class="font-display text-[20px] md:text-[26px] font-semibold text-navy leading-none">Ofertas</h2>
      </div>
      <a href="/productos?oferta=1"
         class="inline-flex items-center gap-1 text-[13px] md:text-[14px] font-semibold text-primary transition-colors hover:text-navy">
        Ver todas
        <iconify-icon icon="lucide:arrow-right" width="14" height="14"></iconify-icon>
      </a>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      <?php foreach (array_slice($ofertas['hits'], 0, 4) as $product): ?>
        <?php require __DIR__ . '/_product_card-v4.php'; ?>
      <?php endforeach; ?>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- ─── Productos grid ──────────────────────────────── -->
<?php if (!empty($productos['hits'])): ?>
<section class="py-6 md:py-10">
  <div class="w-full max-w-[1280px] mx-auto px-4 md:px-5">
    <div class="flex items-end justify-between gap-4 mb-3 md:mb-5">
      <div class="flex items-center gap-2.5">
        <span class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-light text-primary">
          <iconify-icon icon="lucide:package" width="18" height="18"></iconify-icon>
        </span>
        <h2 class="font-display text-[20px] md:text-[26px] font-semibold text-navy leading-none">Productos</h2>
      </div>
      <a href="/productos"
         class="inline-flex items-center gap-1 text-[13px] md:text-[14px] font-semibold text-primary transition-colors hover:text-navy">
        Ver todos
        <iconify-icon icon="lucide:arrow-right" width="14" height="14"></iconify-icon>
      </a>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      <?php foreach ($productos['hits'] as $product): ?>
        <?php require __DIR__ . '/_product_card-v4.php'; ?>
      <?php endforeach; ?>
    </div>
    <div class="mt-8 md:mt-10 flex justify-center">
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

<?php require __DIR__ . '/../includes/footer-v4.php'; ?>
