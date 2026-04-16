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

<!-- Hero -->
<section class="hero">
  <!-- Background images (rotate with crossfade) -->
  <div class="hero-bg" id="hero-bg">
    <?php
    $heroSlides = [
        ['file' => 'kitten-golden', 'alt' => 'Gatito atigrado con ojos dorados mirando con curiosidad'],
        ['file' => 'puppy-hand',    'alt' => 'Cachorro blanco y gris descansando en una mano con ternura'],
        ['file' => 'chihuahua',     'alt' => 'Chihuahua simpático asomándose sobre el hombro de su dueño'],
        ['file' => 'dog-spa',       'alt' => 'Perrito blanco con gorro de baño disfrutando un día de spa'],
        ['file' => 'kitten-sky',    'alt' => 'Gatito calicó sostenido en alto contra un cielo celeste'],
    ];
    foreach ($heroSlides as $i => $slide):
      $isFirst = $i === 0;
    ?>
      <picture class="hero-bg-slide <?= $isFirst ? 'active' : '' ?>">
        <source
          type="image/webp"
          srcset="<?= asset("img/hero/{$slide['file']}-sm.webp") ?> 800w, <?= asset("img/hero/{$slide['file']}.webp") ?> 1600w"
          sizes="100vw">
        <img
          src="<?= asset("img/hero/{$slide['file']}.jpg") ?>"
          srcset="<?= asset("img/hero/{$slide['file']}-sm.jpg") ?> 800w, <?= asset("img/hero/{$slide['file']}.jpg") ?> 1600w"
          sizes="100vw"
          alt="<?= $slide['alt'] ?>"
          width="1600"
          height="700"
          <?= $isFirst ? 'fetchpriority="high"' : 'loading="lazy"' ?>>
      </picture>
    <?php endforeach; ?>
  </div>

  <!-- Gradient overlay (keeps brand color + readability) -->
  <div class="hero-overlay"></div>

  <!-- Floating paw decorations -->
  <iconify-icon icon="mdi:paw" width="48" height="48" class="hero-paw"></iconify-icon>
  <iconify-icon icon="mdi:paw" width="36" height="36" class="hero-paw"></iconify-icon>
  <iconify-icon icon="mdi:paw" width="30" height="30" class="hero-paw"></iconify-icon>
  <iconify-icon icon="mdi:paw" width="42" height="42" class="hero-paw"></iconify-icon>

  <!-- Content -->
  <div class="container hero-content">
    <div class="hero-badge">
      <iconify-icon icon="mdi:paw" width="14" height="14"></iconify-icon>
      <?= SITE_TAGLINE ?>
    </div>
    <h1>Todo para tu mascota<br>en un solo lugar</h1>
    <p>Alimentos, accesorios y todo lo que necesitas para el bienestar de tu compañero. Precios accesibles y atención personalizada.</p>
    <a href="/productos" class="btn btn-primary btn-lg">
      <iconify-icon icon="lucide:package" width="18" height="18"></iconify-icon>
      Ver productos
    </a>
  </div>

  <!-- Wave divider -->
  <div class="hero-wave">
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none" fill="currentColor">
      <path d="M0,48 C360,88 720,8 1080,48 C1260,68 1380,28 1440,48 L1440,80 L0,80 Z"/>
    </svg>
  </div>
</section>

<!-- Categories Carousel -->
<section class="section categories-section animate-on-scroll">
  <div class="categories-carousel-wrapper">
    <button class="carousel-arrow carousel-arrow-left" id="cat-prev" aria-label="Anterior">
      <iconify-icon icon="lucide:chevron-left" width="22" height="22"></iconify-icon>
    </button>
    <div class="categories-carousel" id="categories-carousel">
      <?php for ($loop = 0; $loop < 2; $loop++): ?>
        <?php foreach ($categories as $cat): ?>
          <a href="/productos?categoria=<?= urlencode($cat['slug']) ?>" class="category-circle-item">
            <span class="category-circle-icon">
              <iconify-icon icon="<?= getCategoryIcon($cat['name']) ?>" width="32" height="32"></iconify-icon>
            </span>
            <span class="category-circle-name"><?= htmlspecialchars($cat['name']) ?></span>
          </a>
        <?php endforeach; ?>
      <?php endfor; ?>
    </div>
    <button class="carousel-arrow carousel-arrow-right" id="cat-next" aria-label="Siguiente">
      <iconify-icon icon="lucide:chevron-right" width="22" height="22"></iconify-icon>
    </button>
  </div>
</section>

<!-- Featured Products -->
<?php if (!empty($featured['hits'])): ?>
<section class="section" style="background: var(--surface);">
  <div class="container">
    <h2 class="section-title animate-on-scroll">Productos destacados</h2>
    <div class="product-grid stagger-children">
      <?php foreach ($featured['hits'] as $product): ?>
        <?php require __DIR__ . '/_product_card.php'; ?>
      <?php endforeach; ?>
    </div>
    <div style="text-align:center; margin-top:36px;" class="animate-on-scroll">
      <a href="/productos" class="btn btn-outline">
        Ver todos los productos
        <iconify-icon icon="lucide:arrow-right" width="16" height="16"></iconify-icon>
      </a>
    </div>
  </div>
</section>
<?php endif; ?>

<!-- Store Info -->
<section class="section">
  <div class="container">
    <div class="store-info animate-on-scroll">
      <div class="store-info-grid">
        <div class="store-info-item">
          <span class="store-info-icon">
            <iconify-icon icon="lucide:map-pin" width="20" height="20"></iconify-icon>
          </span>
          <?= STORE_ADDRESS ?>
        </div>
        <div class="store-info-item">
          <span class="store-info-icon">
            <iconify-icon icon="mdi:whatsapp" width="20" height="20"></iconify-icon>
          </span>
          <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>"><?= WHATSAPP_NUMBER ?></a>
        </div>
        <div class="store-info-item">
          <span class="store-info-icon">
            <iconify-icon icon="lucide:instagram" width="20" height="20"></iconify-icon>
          </span>
          <a href="<?= STORE_INSTAGRAM_URL ?>" target="_blank"><?= STORE_INSTAGRAM ?></a>
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
