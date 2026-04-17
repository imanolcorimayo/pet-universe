<?php
$page_title = SITE_NAME . ' — ' . SITE_TAGLINE;

$categories = getCategories();

$featured = searchProducts('', [
    'limit' => 8,
    'sort' => ['updatedAt:desc'],
    'filter' => 'inStock = true',
]);

require __DIR__ . '/../includes/header-v2.php';
?>

<!-- ─── HERO ─────────────────────────────────────────── -->
<section class="relative overflow-hidden paper-noise">
  <div class="max-w-[1200px] mx-auto px-5 pt-10 pb-14 sm:pt-16 sm:pb-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

    <!-- Left: editorial copy -->
    <div class="lg:col-span-6 flex flex-col gap-6">
      <div class="flex items-center gap-3">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rust-wash text-rust-deep text-[11px] font-semibold tracking-[2px] uppercase">
          <span class="w-1.5 h-1.5 rounded-full bg-rust"></span>
          Pet shop de barrio
        </span>
        <span class="font-hand text-ink-soft text-xl sticker sticker-tilt-2">¡hola!</span>
      </div>

      <h1 class="font-display font-semibold text-[48px] sm:text-[64px] lg:text-[72px] leading-[0.98] tracking-[-0.02em] text-ink">
        Todo para tu mascota,<br>
        <span class="italic text-rust">con el consejo</span><br>
        <span class="hand-underline">de siempre.</span>
      </h1>

      <p class="text-ink-soft text-[17px] sm:text-[18px] leading-relaxed max-w-[520px]">
        En <strong class="text-ink">Luis Agote 1924</strong>, Córdoba, atendemos como si fuera tu casa. Alimentos, accesorios, snacks y asesoramiento real — personalmente o por WhatsApp.
      </p>

      <div class="flex flex-wrap gap-3 pt-2">
        <a href="/productos" class="inline-flex items-center gap-2 bg-ink text-paper hover:bg-rust transition-colors rounded-full px-6 py-3.5 text-[15px] font-semibold">
          <iconify-icon icon="lucide:package" width="18" height="18"></iconify-icon>
          Ver productos
        </a>
        <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener"
           class="inline-flex items-center gap-2 bg-transparent border-2 border-ink text-ink hover:bg-ink hover:text-paper transition-colors rounded-full px-6 py-3.5 text-[15px] font-semibold">
          <iconify-icon icon="mdi:whatsapp" width="18" height="18"></iconify-icon>
          Consultanos
        </a>
      </div>

      <div class="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-[13px] text-ink-soft">
        <span class="flex items-center gap-1.5"><iconify-icon icon="lucide:truck" width="15" height="15" class="text-teal-deep"></iconify-icon> Envíos en Córdoba</span>
        <span class="hidden sm:inline text-ink-muted">·</span>
        <span class="flex items-center gap-1.5"><iconify-icon icon="lucide:credit-card" width="15" height="15" class="text-teal-deep"></iconify-icon> Efectivo, transferencia, tarjeta</span>
        <span class="hidden sm:inline text-ink-muted">·</span>
        <span class="flex items-center gap-1.5"><iconify-icon icon="mdi:paw" width="15" height="15" class="text-teal-deep"></iconify-icon> Tu mascota bienvenida</span>
      </div>
    </div>

    <!-- Right: photo with stickers -->
    <div class="lg:col-span-6 relative">
      <div class="relative rounded-[28px] overflow-hidden shadow-[0_25px_60px_-20px_rgba(26,24,21,0.25)]">
        <img src="<?= asset('img/hero/store-interior.jpeg') ?>"
             alt="Interior de Pet Universe — Luis Agote 1924"
             class="w-full h-[420px] sm:h-[520px] object-cover"
             fetchpriority="high">
        <!-- caption strip bottom -->
        <div class="absolute inset-x-0 bottom-0 px-5 py-4 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent">
          <div class="text-cream text-[11px] font-semibold tracking-[2px] uppercase opacity-80">Nuestro local</div>
          <div class="text-paper font-display text-lg leading-tight">Pasá a conocernos cuando quieras.</div>
        </div>
      </div>

      <!-- Floating sticker badges -->
      <div class="absolute -top-4 -right-2 sm:-top-6 sm:-right-6 sticker sticker-tilt-1 bg-rust text-paper rounded-2xl px-4 py-3 shadow-lg rotate-[-6deg]">
        <div class="font-hand text-3xl leading-none">¡oferta!</div>
        <div class="text-[10px] font-semibold tracking-[1.5px] uppercase mt-0.5 opacity-90">en efectivo</div>
      </div>
      <div class="hidden sm:block absolute -bottom-5 -left-5 sticker sticker-tilt-2 bg-cream border border-ink/10 rounded-xl px-3 py-2 shadow-md">
        <div class="flex items-center gap-2">
          <iconify-icon icon="mdi:paw" width="20" height="20" class="text-teal-deep"></iconify-icon>
          <div class="leading-tight">
            <div class="text-[10px] font-semibold tracking-[1.5px] uppercase text-ink-muted">Atienden</div>
            <div class="font-display font-semibold text-ink text-sm">personalmente</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ─── TICKER MARQUEE ───────────────────────────────── -->
<div class="bg-ink text-paper border-y border-ink/10">
  <div class="marquee-mask overflow-hidden py-3">
    <div class="flex w-max animate-marquee">
      <?php for ($i = 0; $i < 2; $i++): ?>
      <div class="flex items-center gap-10 px-5 text-[13px] font-medium whitespace-nowrap">
        <span class="flex items-center gap-2"><iconify-icon icon="mdi:paw" width="14" height="14" class="text-teal"></iconify-icon> Asesoramiento real de pet shop</span>
        <span class="text-ink-muted">✦</span>
        <span class="flex items-center gap-2"><iconify-icon icon="lucide:map-pin" width="14" height="14" class="text-teal"></iconify-icon> Luis Agote 1924, Córdoba</span>
        <span class="text-ink-muted">✦</span>
        <span class="flex items-center gap-2"><iconify-icon icon="lucide:truck" width="14" height="14" class="text-teal"></iconify-icon> Hacemos envíos en capital</span>
        <span class="text-ink-muted">✦</span>
        <span class="flex items-center gap-2"><iconify-icon icon="mdi:whatsapp" width="14" height="14" class="text-teal"></iconify-icon> WhatsApp de 9 a 20</span>
        <span class="text-ink-muted">✦</span>
        <span class="flex items-center gap-2"><iconify-icon icon="lucide:credit-card" width="14" height="14" class="text-teal"></iconify-icon> Efectivo, transferencia, tarjeta</span>
        <span class="text-ink-muted">✦</span>
      </div>
      <?php endfor; ?>
    </div>
  </div>
</div>

<!-- ─── CATEGORIES ───────────────────────────────────── -->
<?php if (!empty($categories)): ?>
<section id="categorias" class="py-16 sm:py-20">
  <div class="max-w-[1200px] mx-auto px-5 mb-8 flex items-end justify-between gap-6 flex-wrap">
    <div>
      <span class="text-[11px] font-semibold tracking-[3px] uppercase text-rust">Elegí por categoría</span>
      <h2 class="mt-2 font-display font-semibold text-[36px] sm:text-[44px] leading-[1.05] text-ink max-w-[560px]">
        Todo lo que tu <em class="text-rust not-italic font-display italic">mascota</em> necesita.
      </h2>
    </div>
    <a href="/productos" class="hidden sm:inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-rust transition-colors">
      Ver todos los productos
      <iconify-icon icon="lucide:arrow-right" width="16" height="16"></iconify-icon>
    </a>
  </div>

  <div class="max-w-[1200px] mx-auto">
    <div class="scroll-row overflow-x-auto snap-x snap-mandatory scroll-px-5">
      <div class="flex items-start gap-5 sm:gap-7 px-5 pb-4 w-max">
        <?php foreach ($categories as $cat): ?>
        <a href="/productos?categoria=<?= urlencode($cat['slug']) ?>"
           class="group flex flex-col items-center gap-3 w-[96px] sm:w-[110px] shrink-0 snap-start">
          <span class="relative w-[88px] h-[88px] sm:w-[100px] sm:h-[100px] rounded-full bg-cream border border-ink/10 grid place-items-center transition-all group-hover:border-rust group-hover:bg-rust-wash group-hover:-translate-y-1">
            <iconify-icon icon="<?= getCategoryIcon($cat['name']) ?>" width="32" height="32" class="text-ink transition-colors group-hover:text-rust-deep"></iconify-icon>
          </span>
          <span class="text-center text-[11px] font-semibold tracking-[0.5px] uppercase text-ink leading-tight line-clamp-2">
            <?= htmlspecialchars($cat['name']) ?>
          </span>
        </a>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- ─── FEATURED PRODUCTS ────────────────────────────── -->
<?php if (!empty($featured['hits'])): ?>
<section class="pb-16 sm:pb-20">
  <div class="max-w-[1200px] mx-auto px-5">
    <div class="flex items-end justify-between gap-6 flex-wrap mb-8">
      <div>
        <span class="text-[11px] font-semibold tracking-[3px] uppercase text-rust">Recién traídos</span>
        <h2 class="mt-2 font-display font-semibold text-[36px] sm:text-[44px] leading-[1.05] text-ink">
          Lo nuevo en el local.
        </h2>
      </div>
      <span class="font-hand text-rust text-2xl sticker sticker-tilt-3">así como suena</span>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
      <?php foreach ($featured['hits'] as $product): ?>
        <?php require __DIR__ . '/_product_card-v2.php'; ?>
      <?php endforeach; ?>
    </div>

    <div class="flex justify-center mt-10">
      <a href="/productos" class="inline-flex items-center gap-2 border-2 border-ink text-ink hover:bg-ink hover:text-paper transition-colors rounded-full px-6 py-3 text-[14px] font-semibold">
        Ver todos los productos
        <iconify-icon icon="lucide:arrow-right" width="16" height="16"></iconify-icon>
      </a>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- ─── CONOCÉ EL LOCAL ──────────────────────────────── -->
<section id="local" class="bg-paper-deep py-20 sm:py-24">
  <div class="max-w-[1200px] mx-auto px-5 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

    <!-- Text -->
    <div class="lg:col-span-5">
      <span class="text-[11px] font-semibold tracking-[3px] uppercase text-rust">Conocé el local</span>
      <h2 class="mt-2 font-display font-semibold text-[38px] sm:text-[46px] leading-[1.05] text-ink">
        Un pet shop<br>
        con cara y nombre.
      </h2>
      <div class="dots-divider my-6 max-w-[220px]"></div>
      <p class="text-ink-soft text-[17px] leading-relaxed max-w-[460px]">
        No somos una cadena. Somos un local de barrio en Luis Agote 1924. Vení a pasar el rato, te recomendamos la mejor comida para tu perro o gato, y si no tenés tiempo, te lo mandamos a casa.
      </p>
      <blockquote class="mt-6 border-l-2 border-rust pl-4 italic text-ink font-display text-xl leading-snug max-w-[440px]">
        “Acá tu mascota siempre es bienvenida.”
      </blockquote>
      <div class="mt-7 flex flex-wrap gap-3">
        <a href="https://www.google.com/maps/search/?api=1&query=Luis+Agote+1924+Cordoba" target="_blank" rel="noopener"
           class="inline-flex items-center gap-2 bg-ink text-paper hover:bg-rust transition-colors rounded-full px-5 py-3 text-[14px] font-semibold">
          <iconify-icon icon="lucide:map-pin" width="16" height="16"></iconify-icon>
          Cómo llegar
        </a>
        <a href="<?= STORE_INSTAGRAM_URL ?>" target="_blank" rel="noopener"
           class="inline-flex items-center gap-2 bg-paper border border-ink/15 text-ink hover:border-ink transition-colors rounded-full px-5 py-3 text-[14px] font-semibold">
          <iconify-icon icon="lucide:instagram" width="16" height="16"></iconify-icon>
          Seguinos
        </a>
      </div>
    </div>

    <!-- Two-photo editorial composition -->
    <div class="lg:col-span-7">
      <div class="grid grid-cols-5 grid-rows-5 gap-4 sm:gap-5 h-[420px] sm:h-[520px]">
        <div class="col-span-3 row-span-5 rounded-[24px] overflow-hidden relative">
          <img src="<?= asset('img/hero/store-interior.jpeg') ?>" alt="Interior de Pet Universe — mostrador y estanterías"
               class="w-full h-full object-cover" loading="lazy">
          <span class="absolute bottom-3 left-3 font-hand text-paper text-2xl drop-shadow">por dentro</span>
        </div>
        <div class="col-span-2 row-span-3 rounded-[24px] overflow-hidden relative">
          <img src="<?= asset('img/hero/store-dog-logo.jpeg') ?>" alt="Bulldog visitando la tienda"
               class="w-full h-full object-cover" loading="lazy">
          <span class="absolute bottom-3 left-3 font-hand text-paper text-2xl drop-shadow">clientela</span>
        </div>
        <div class="col-span-2 row-span-2 rounded-[24px] bg-rust text-paper p-5 flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-semibold tracking-[2px] uppercase opacity-80">Horario</div>
            <div class="font-display text-2xl font-semibold leading-tight mt-1">Lun a Sáb<br>9 a 20 hs</div>
          </div>
          <div class="flex items-center gap-2 text-[12px] font-medium">
            <iconify-icon icon="lucide:map-pin" width="14" height="14"></iconify-icon>
            Luis Agote 1924
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ─── WHY US / SERVICE PILLARS ─────────────────────── -->
<section class="py-20 sm:py-24">
  <div class="max-w-[1200px] mx-auto px-5">
    <div class="text-center max-w-[640px] mx-auto mb-12">
      <span class="text-[11px] font-semibold tracking-[3px] uppercase text-rust">Cómo trabajamos</span>
      <h2 class="mt-2 font-display font-semibold text-[36px] sm:text-[44px] leading-[1.05] text-ink">
        Atención de barrio,<br>con la prolijidad de siempre.
      </h2>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <?php
      $pillars = [
        ['icon' => 'mdi:paw',           'title' => 'Asesoramiento',  'desc' => 'Te ayudamos a elegir lo mejor para tu mascota, sin vueltas.'],
        ['icon' => 'lucide:store',      'title' => 'Retirá en el local', 'desc' => 'Pasá por Luis Agote 1924. Dejamos el pedido listo.'],
        ['icon' => 'lucide:truck',      'title' => 'Envíos en Córdoba', 'desc' => 'Te lo llevamos a casa en capital.'],
        ['icon' => 'lucide:credit-card','title' => 'Pagá como quieras', 'desc' => 'Efectivo, transferencia o tarjeta — con descuento en efectivo.'],
      ];
      foreach ($pillars as $p): ?>
      <div class="bg-paper border border-ink/10 rounded-2xl p-6 lift-on-hover">
        <div class="w-12 h-12 rounded-full bg-teal-wash grid place-items-center mb-4">
          <iconify-icon icon="<?= $p['icon'] ?>" width="22" height="22" class="text-teal-deep"></iconify-icon>
        </div>
        <div class="font-display font-semibold text-[18px] text-ink leading-tight"><?= $p['title'] ?></div>
        <p class="text-[14px] text-ink-soft leading-relaxed mt-2"><?= $p['desc'] ?></p>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<!-- ─── WHATSAPP CTA BAND ────────────────────────────── -->
<section class="pb-20 sm:pb-24">
  <div class="max-w-[1200px] mx-auto px-5">
    <div class="relative bg-rust text-paper rounded-[32px] overflow-hidden p-10 sm:p-14">
      <div class="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-paper/10 blur-3xl pointer-events-none"></div>
      <div class="absolute top-6 right-6 font-hand text-3xl sm:text-4xl text-paper/30 sticker sticker-tilt-4 select-none">respondemos rápido</div>

      <div class="relative max-w-[560px]">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper/15 text-paper text-[11px] font-semibold tracking-[2px] uppercase">
          <iconify-icon icon="mdi:whatsapp" width="12" height="12"></iconify-icon>
          WhatsApp
        </span>
        <h2 class="mt-4 font-display font-semibold text-[36px] sm:text-[46px] leading-[1.05]">
          ¿No sabés qué<br>darle a tu mascota?
        </h2>
        <p class="mt-4 text-paper/80 text-[16px] sm:text-[17px] leading-relaxed">
          Escribinos contándonos qué tenés en casa y te recomendamos sin compromiso. Atendemos personalmente.
        </p>
        <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener"
           class="inline-flex items-center gap-2 mt-6 bg-paper text-ink hover:bg-ink hover:text-paper transition-colors rounded-full px-6 py-3.5 text-[15px] font-semibold">
          <iconify-icon icon="mdi:whatsapp" width="18" height="18"></iconify-icon>
          Consultanos por WhatsApp
        </a>
      </div>
    </div>
  </div>
</section>

<?php require __DIR__ . '/../includes/footer-v2.php'; ?>
