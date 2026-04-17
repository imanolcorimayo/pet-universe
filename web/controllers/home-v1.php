<?php
$page_title = SITE_NAME . ' — ' . SITE_TAGLINE;

// Fetch categories
$categories = getCategories();

// Fetch featured products (latest 8)
$featured = searchProducts('', [
    'limit' => 8,
    'sort' => ['updatedAt:desc'],
    'filter' => 'inStock = true',
]);

require __DIR__ . '/../includes/header.php';
?>

<section class="relative text-white min-h-[420px] md:min-h-[72vh] md:max-h-[720px] flex flex-col justify-end overflow-hidden">
  <div id="hero-bg" class="absolute inset-0 z-0">
    <?php
    $heroSlides = [
        ['file' => 'store-interior', 'alt' => 'Interior del local Pet Universe — mostrador y estanterías'],
        ['file' => 'store-exterior', 'alt' => 'Fachada del local Pet Universe en Luis Agote 1924, Córdoba'],
        ['file' => 'store-dog-logo', 'alt' => 'Bulldog visitando Pet Universe'],
    ];
    foreach ($heroSlides as $i => $slide):
      $isFirst = $i === 0;
    ?>
      <picture class="hero-bg-slide block absolute inset-0 opacity-0 transition-opacity duration-[1200ms] ease-in-out [&.active]:opacity-100<?= $isFirst ? ' active' : '' ?>">
        <source
          type="image/webp"
          srcset="<?= asset("img/hero/{$slide['file']}-sm.webp") ?> 800w, <?= asset("img/hero/{$slide['file']}.webp") ?> 1600w"
          sizes="100vw">
        <img
          src="<?= asset("img/hero/{$slide['file']}.jpeg") ?>"
          srcset="<?= asset("img/hero/{$slide['file']}-sm.jpeg") ?> 800w, <?= asset("img/hero/{$slide['file']}.jpeg") ?> 1600w"
          sizes="100vw"
          alt="<?= $slide['alt'] ?>"
          width="1600"
          height="900"
          class="absolute inset-0 w-full h-full object-cover object-center"
          <?= $isFirst ? 'fetchpriority="high"' : 'loading="lazy"' ?>>
      </picture>
    <?php endforeach; ?>
  </div>

  <div class="absolute inset-0 z-[1] bg-[linear-gradient(to_top,rgba(20,16,56,0.96)_0%,rgba(20,16,56,0.82)_28%,rgba(20,16,56,0.45)_55%,rgba(20,16,56,0.15)_75%,transparent_95%)]"></div>

  <iconify-icon icon="mdi:paw" width="48" height="48"
                class="absolute opacity-[0.08] text-white z-[2] pointer-events-none animate-[float_7s_ease-in-out_infinite] top-[12%] left-[8%] [--rotate:-15deg]"></iconify-icon>
  <iconify-icon icon="mdi:paw" width="36" height="36"
                class="absolute opacity-[0.08] text-white z-[2] pointer-events-none animate-[float_7s_ease-in-out_infinite] top-[55%] right-[10%] [--rotate:20deg] [animation-delay:-2.5s]"></iconify-icon>
  <iconify-icon icon="mdi:paw" width="30" height="30"
                class="absolute opacity-[0.08] text-white z-[2] pointer-events-none animate-[float_7s_ease-in-out_infinite] bottom-[25%] left-[18%] [--rotate:10deg] [animation-delay:-4.5s]"></iconify-icon>
  <iconify-icon icon="mdi:paw" width="42" height="42"
                class="absolute opacity-[0.08] text-white z-[2] pointer-events-none animate-[float_7s_ease-in-out_infinite] top-[25%] right-[22%] [--rotate:-25deg] [animation-delay:-1.5s]"></iconify-icon>

  <div class="relative z-[5] w-full max-w-[1200px] mx-auto px-5 pb-16 md:pb-[72px]">
    <div class="inline-flex items-center gap-1.5 py-1.5 px-4 bg-white/10 border border-white/15 rounded-full text-xs md:text-[13px] font-medium text-teal mb-6 backdrop-blur-sm animate-[fadeInUp_0.6s_ease-out_both]">
      <iconify-icon icon="mdi:paw" width="14" height="14"></iconify-icon>
      <?= SITE_TAGLINE ?>
    </div>
    <h1 class="font-display text-[1.75rem] sm:text-[2rem] md:text-[3.2rem] font-bold leading-[1.15] mb-4 animate-[fadeInUp_0.6s_ease-out_0.1s_both]">Todo para tu mascota<br>en un solo lugar</h1>
    <p class="text-[1rem] md:text-[1.15rem] opacity-90 mb-8 max-w-[520px] leading-[1.7] animate-[fadeInUp_0.6s_ease-out_0.2s_both]">Alimentos, accesorios y todo lo que necesitas para el bienestar de tu compañero. Precios accesibles y atención personalizada.</p>
    <a href="/productos"
       class="inline-flex items-center justify-center gap-2 px-9 py-4 text-[15px] md:text-[16px] font-bold tracking-[0.3px] rounded-full border-2 border-primary bg-primary text-white transition-all hover:bg-navy hover:border-navy hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(64,15,255,0.28)] animate-[fadeInUp_0.6s_ease-out_0.3s_both]">
      <iconify-icon icon="lucide:package" width="18" height="18"></iconify-icon>
      Ver productos
    </a>
  </div>

  <div class="absolute -bottom-px left-0 w-full z-[4] leading-none text-canvas">
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none" fill="currentColor" class="w-full h-[60px] block">
      <path d="M0,48 C360,88 720,8 1080,48 C1260,68 1380,28 1440,48 L1440,80 L0,80 Z"/>
    </svg>
  </div>
</section>

<section class="py-10 animate-on-scroll">
  <div class="relative max-w-[1200px] mx-auto px-[44px] md:px-[52px]">
    <button id="cat-prev" aria-label="Anterior"
            class="absolute top-1/2 -translate-y-1/2 left-1 w-8 md:w-[38px] h-8 md:h-[38px] rounded-full bg-white border border-hairline text-navy flex items-center justify-center z-[2] cursor-pointer transition-all shadow-[0_1px_4px_rgba(32,28,78,0.04)] hover:bg-primary hover:text-white hover:border-primary hover:shadow-[0_4px_16px_rgba(32,28,78,0.06)]">
      <iconify-icon icon="lucide:chevron-left" width="22" height="22"></iconify-icon>
    </button>
    <div id="categories-carousel"
         class="scroll-row flex gap-2 md:gap-5 overflow-x-auto py-4">
      <?php for ($loop = 0; $loop < 2; $loop++): ?>
        <?php foreach ($categories as $cat): ?>
          <a href="/productos?categoria=<?= urlencode($cat['slug']) ?>"
             class="group flex flex-col items-center gap-2.5 shrink-0 p-1 transition-transform hover:-translate-y-1">
            <span class="w-20 md:w-[110px] lg:w-[120px] h-20 md:h-[110px] lg:h-[120px] rounded-full flex items-center justify-center bg-primary-light text-primary transition-all border-[3px] border-transparent group-hover:bg-primary group-hover:text-white group-hover:border-teal group-hover:shadow-[0_8px_24px_rgba(64,15,255,0.18)]">
              <iconify-icon icon="<?= getCategoryIcon($cat['name']) ?>" width="32" height="32"></iconify-icon>
            </span>
            <span class="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.4px] text-navy text-center max-w-[80px] md:max-w-[100px] leading-[1.3] transition-colors group-hover:text-primary">
              <?= htmlspecialchars($cat['name']) ?>
            </span>
          </a>
        <?php endforeach; ?>
      <?php endfor; ?>
    </div>
    <button id="cat-next" aria-label="Siguiente"
            class="absolute top-1/2 -translate-y-1/2 right-1 w-8 md:w-[38px] h-8 md:h-[38px] rounded-full bg-white border border-hairline text-navy flex items-center justify-center z-[2] cursor-pointer transition-all shadow-[0_1px_4px_rgba(32,28,78,0.04)] hover:bg-primary hover:text-white hover:border-primary hover:shadow-[0_4px_16px_rgba(32,28,78,0.06)]">
      <iconify-icon icon="lucide:chevron-right" width="22" height="22"></iconify-icon>
    </button>
  </div>
</section>

<?php if (!empty($featured['hits'])): ?>
<section class="py-10 md:py-14 bg-white">
  <div class="w-full max-w-[1200px] mx-auto px-5">
    <h2 class="font-display text-[1.4rem] md:text-[1.75rem] font-semibold mb-7 text-navy leading-[1.3] animate-on-scroll">Productos destacados</h2>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[18px] stagger-children">
      <?php foreach ($featured['hits'] as $product): ?>
        <?php require __DIR__ . '/_product_card.php'; ?>
      <?php endforeach; ?>
    </div>
    <div class="text-center mt-9 animate-on-scroll">
      <a href="/productos"
         class="inline-flex items-center justify-center gap-2 px-7 py-[13px] text-[14px] font-semibold tracking-[0.3px] rounded-full border-2 border-primary bg-transparent text-primary transition-all hover:bg-primary hover:text-white hover:-translate-y-px">
        Ver todos los productos
        <iconify-icon icon="lucide:arrow-right" width="16" height="16"></iconify-icon>
      </a>
    </div>
  </div>
</section>
<?php endif; ?>

<section class="py-10 md:py-14">
  <div class="w-full max-w-[1200px] mx-auto px-5">
    <div class="bg-white border border-hairline rounded-[20px] p-[18px] md:p-8 animate-on-scroll">
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-start md:justify-center gap-1 md:gap-10 md:flex-wrap">
        <div class="flex items-center gap-2.5 text-[14px] text-muted md:py-0 py-2 [&+&]:border-t md:[&+&]:border-t-0 [&+&]:border-hairline">
          <span class="flex items-center justify-center w-[34px] md:w-10 h-[34px] md:h-10 rounded-full bg-primary-light text-primary shrink-0">
            <iconify-icon icon="lucide:map-pin" width="20" height="20"></iconify-icon>
          </span>
          <?= STORE_ADDRESS ?>
        </div>
        <div class="flex items-center gap-2.5 text-[14px] text-muted md:py-0 py-2 [&+&]:border-t md:[&+&]:border-t-0 [&+&]:border-hairline">
          <span class="flex items-center justify-center w-[34px] md:w-10 h-[34px] md:h-10 rounded-full bg-primary-light text-primary shrink-0">
            <iconify-icon icon="mdi:whatsapp" width="20" height="20"></iconify-icon>
          </span>
          <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" class="text-muted transition-colors hover:text-primary"><?= WHATSAPP_NUMBER ?></a>
        </div>
        <div class="flex items-center gap-2.5 text-[14px] text-muted md:py-0 py-2 [&+&]:border-t md:[&+&]:border-t-0 [&+&]:border-hairline">
          <span class="flex items-center justify-center w-[34px] md:w-10 h-[34px] md:h-10 rounded-full bg-primary-light text-primary shrink-0">
            <iconify-icon icon="lucide:instagram" width="20" height="20"></iconify-icon>
          </span>
          <a href="<?= STORE_INSTAGRAM_URL ?>" target="_blank" class="text-muted transition-colors hover:text-primary"><?= STORE_INSTAGRAM ?></a>
        </div>
      </div>
    </div>
  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
<script>
// Hero background slideshow
(function() {
  const slides = document.querySelectorAll('#hero-bg .hero-bg-slide');
  if (slides.length < 2) return;
  let current = 0;
  setInterval(function() {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }, 5000);
})();

// Categories carousel
(function() {
  const carousel = document.getElementById('categories-carousel');
  const prev = document.getElementById('cat-prev');
  const next = document.getElementById('cat-next');
  if (!carousel || !prev || !next) return;

  // The first half is the real set, second half is the clone
  const halfScroll = carousel.scrollWidth / 2;
  const scrollSpeed = 0.6; // px per frame
  const arrowAmount = 200;
  let paused = false;
  let userScrolling = false;
  let userTimeout = null;

  // Seamless loop: when we reach the clone, jump back to the original
  function loopCheck() {
    if (carousel.scrollLeft >= halfScroll) {
      carousel.scrollLeft -= halfScroll;
    } else if (carousel.scrollLeft <= 0) {
      carousel.scrollLeft += halfScroll;
    }
  }

  // Auto-scroll animation
  function tick() {
    if (!paused && !userScrolling) {
      carousel.scrollLeft += scrollSpeed;
      loopCheck();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Pause on hover / touch
  carousel.addEventListener('mouseenter', () => { paused = true; });
  carousel.addEventListener('mouseleave', () => { paused = false; });
  carousel.addEventListener('touchstart', () => { paused = true; userScrolling = true; }, { passive: true });
  carousel.addEventListener('touchend', () => {
    clearTimeout(userTimeout);
    userTimeout = setTimeout(() => { paused = false; userScrolling = false; loopCheck(); }, 2000);
  });

  // Manual scroll (wheel / trackpad) — pause briefly then resume
  carousel.addEventListener('wheel', () => {
    paused = true;
    userScrolling = true;
    clearTimeout(userTimeout);
    userTimeout = setTimeout(() => { paused = false; userScrolling = false; loopCheck(); }, 2000);
  }, { passive: true });

  // Arrow buttons
  prev.addEventListener('click', () => {
    paused = true;
    userScrolling = true;
    carousel.scrollBy({ left: -arrowAmount, behavior: 'smooth' });
    clearTimeout(userTimeout);
    userTimeout = setTimeout(() => { paused = false; userScrolling = false; loopCheck(); }, 2000);
  });
  next.addEventListener('click', () => {
    paused = true;
    userScrolling = true;
    carousel.scrollBy({ left: arrowAmount, behavior: 'smooth' });
    clearTimeout(userTimeout);
    userTimeout = setTimeout(() => { paused = false; userScrolling = false; loopCheck(); }, 2000);
  });

  // Hide arrows since it auto-scrolls (keep for manual navigation)
  prev.style.opacity = '';
  next.style.opacity = '';
})();
</script>
