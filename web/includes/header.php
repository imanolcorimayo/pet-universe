<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($page_title ?? SITE_NAME) ?></title>
  <meta name="description" content="<?= htmlspecialchars($page_description ?? SITE_NAME . ' — ' . SITE_TAGLINE . '. Alimentos, accesorios y más para tu mascota en Córdoba.') ?>">
  <?php if (!empty($isNoindex)): ?>
  <meta name="robots" content="noindex, nofollow">
  <?php endif; ?>

  <meta property="og:title" content="<?= htmlspecialchars($page_title ?? SITE_NAME) ?>">
  <meta property="og:description" content="<?= htmlspecialchars($page_description ?? SITE_NAME . ' — ' . SITE_TAGLINE) ?>">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_AR">
  <?php if (!empty($page_og_image)): ?>
  <meta property="og:image" content="<?= $page_og_image ?>">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="1200">
  <?php endif; ?>

  <?php if (!empty($page_canonical)): ?>
  <link rel="canonical" href="<?= $page_canonical ?>">
  <?php endif; ?>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&display=swap" rel="stylesheet">

  <script src="https://code.iconify.design/iconify-icon/2.3.0/iconify-icon.min.js"></script>

  <link rel="stylesheet" href="<?= asset('css/style.css') ?>">

  <script>
  function imgFallback(img){var p=img.closest('picture');if(p){p.style.display='none';var f=p.nextElementSibling;if(f)f.style.display=''}}
  </script>
</head>
<body class="bg-canvas text-navy min-h-dvh flex flex-col antialiased">

  <?php
    // Categories may fail to load (e.g. Meilisearch down on the 503 error page).
    // Degrade gracefully instead of taking the whole header with it.
    $categories = [];
    if (function_exists('getCategories')) {
        try { $categories = getCategories(); } catch (Throwable $e) { $categories = []; }
    }
  ?>

  <!-- ─── Utility strip (desktop only, not sticky) ─── -->
  <div class="hidden md:block bg-navy text-white/75 text-[12px] border-b border-white/5">
    <div class="w-full max-w-[1280px] mx-auto px-5 h-8 flex items-center justify-between gap-6">
      <div class="flex items-center gap-5">
        <span class="inline-flex items-center gap-1.5">
          <iconify-icon icon="lucide:map-pin" width="13" height="13" class="text-teal"></iconify-icon>
          <?= STORE_ADDRESS ?>
        </span>
        <span class="inline-flex items-center gap-1.5">
          <iconify-icon icon="lucide:clock" width="13" height="13" class="text-teal"></iconify-icon>
          Lun a Sáb · 9 a 20
        </span>
        <span class="inline-flex items-center gap-1.5">
          <iconify-icon icon="lucide:truck" width="13" height="13" class="text-teal"></iconify-icon>
          Envíos en Córdoba
        </span>
      </div>
      <div class="flex items-center gap-5">
        <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener"
           class="inline-flex items-center gap-1.5 text-white/75 transition-colors hover:text-teal">
          <iconify-icon icon="mdi:whatsapp" width="14" height="14" class="text-teal"></iconify-icon>
          +54 9 351 760 5708
        </a>
        <a href="<?= STORE_INSTAGRAM_URL ?>" target="_blank" rel="noopener"
           class="inline-flex items-center gap-1.5 text-white/75 transition-colors hover:text-teal">
          <iconify-icon icon="lucide:instagram" width="14" height="14" class="text-teal"></iconify-icon>
          <?= STORE_INSTAGRAM ?>
        </a>
      </div>
    </div>
  </div>

  <!-- ─── Main header (sticky, navy, logo + centered search + actions) ─── -->
  <header class="bg-navy text-white sticky top-0 z-[101] shadow-[0_2px_20px_rgba(32,28,78,0.18)]">
    <div class="w-full max-w-[1280px] mx-auto px-4 md:px-5">

      <!-- Desktop row -->
      <div class="hidden md:flex items-center gap-8 h-[84px]">
        <a href="/" class="shrink-0 group flex items-center transition-transform hover:scale-[1.03]">
          <img src="<?= asset('img/logo.png') ?>" alt="<?= SITE_NAME ?>"
               class="h-[64px] w-auto rounded-full">
        </a>

        <form action="/buscar" method="GET"
              class="flex-1 max-w-[680px] mx-auto relative"
              autocomplete="off">
          <div class="relative flex items-center bg-white rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.08)] focus-within:shadow-[0_4px_20px_rgba(0,206,206,0.25)] focus-within:ring-2 focus-within:ring-teal transition-shadow">
            <iconify-icon icon="lucide:search" width="18" height="18"
                          class="absolute left-[18px] text-muted pointer-events-none"></iconify-icon>
            <input type="text" name="q" id="search-input"
                   placeholder="Buscar alimentos, accesorios, marcas..."
                   minlength="2" maxlength="100"
                   class="flex-1 py-3 pl-12 pr-[92px] rounded-full bg-transparent text-navy text-[15px] placeholder:text-muted outline-none">
            <button type="submit"
                    class="absolute right-1 top-1 bottom-1 px-5 bg-teal text-navy font-bold text-[13px] rounded-full transition-colors hover:bg-teal-deep hover:text-white">
              Buscar
            </button>
          </div>
          <div id="search-autocomplete"
               class="empty:hidden absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-2xl shadow-[0_12px_40px_rgba(32,28,78,0.18)] overflow-hidden z-[110]"></div>
        </form>

        <div class="shrink-0 flex items-center gap-2">
          <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener"
             aria-label="WhatsApp"
             class="flex items-center gap-2 px-3.5 py-2 rounded-full text-white/85 text-[13px] font-semibold transition-colors hover:bg-white/10 hover:text-white">
            <iconify-icon icon="mdi:whatsapp" width="20" height="20" class="text-teal"></iconify-icon>
            <span class="hidden lg:inline">WhatsApp</span>
          </a>
          <a href="/carrito" aria-label="Carrito"
             class="relative flex items-center gap-2 px-3.5 py-2 rounded-full text-white/85 text-[13px] font-semibold transition-colors hover:bg-white/10 hover:text-white">
            <iconify-icon icon="lucide:shopping-bag" width="20" height="20" class="text-teal"></iconify-icon>
            <span class="hidden lg:inline">Carrito</span>
            <span id="cart-badge"
                  class="absolute top-0 right-1 w-[18px] h-[18px] rounded-full bg-teal text-navy text-[10px] font-bold flex items-center justify-center border-2 border-navy"
                  style="display:none;">0</span>
          </a>
        </div>
      </div>

      <!-- Mobile: two rows -->
      <div class="md:hidden">
        <div class="flex items-center justify-between h-[60px]">
          <button id="mobile-menu-toggle" aria-label="Menú"
                  class="flex items-center justify-center w-10 h-10 rounded-xl text-white transition-colors hover:bg-white/10">
            <iconify-icon icon="lucide:menu" width="24" height="24"></iconify-icon>
          </button>
          <a href="/" class="flex items-center">
            <img src="<?= asset('img/logo.png') ?>" alt="<?= SITE_NAME ?>"
                 class="h-[52px] w-auto rounded-full">
          </a>
          <a href="/carrito" aria-label="Carrito"
             class="relative flex items-center justify-center w-10 h-10 rounded-xl text-white transition-colors hover:bg-white/10">
            <iconify-icon icon="lucide:shopping-bag" width="22" height="22"></iconify-icon>
            <span id="cart-badge-mobile"
                  class="absolute top-1 right-1 w-[16px] h-[16px] rounded-full bg-teal text-navy text-[9px] font-bold flex items-center justify-center border-2 border-navy"
                  style="display:none;">0</span>
          </a>
        </div>

        <form action="/buscar" method="GET" class="pb-3 relative" autocomplete="off">
          <div class="relative flex items-center bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] focus-within:ring-2 focus-within:ring-teal transition-shadow">
            <iconify-icon icon="lucide:search" width="17" height="17"
                          class="absolute left-4 text-muted pointer-events-none"></iconify-icon>
            <input type="text" name="q" id="search-input-mobile"
                   placeholder="Buscar productos..."
                   minlength="2" maxlength="100"
                   class="flex-1 py-2.5 pl-11 pr-4 rounded-full bg-transparent text-navy text-[14px] placeholder:text-muted outline-none">
            <button type="submit" aria-label="Buscar"
                    class="absolute right-1 top-1 bottom-1 px-4 bg-teal text-navy font-bold text-[12px] rounded-full">
              Buscar
            </button>
          </div>
          <div id="search-autocomplete-mobile"
               class="empty:hidden absolute top-[calc(100%-4px)] left-0 right-0 bg-white rounded-2xl shadow-[0_12px_40px_rgba(32,28,78,0.18)] overflow-hidden z-[110]"></div>
        </form>
      </div>
    </div>
  </header>

  <!-- ─── Mobile category circles (no container, sit on page canvas) ─── -->
  <?php if (!empty($categories)): ?>
  <nav class="md:hidden">
    <div class="w-full max-w-[1280px] mx-auto">
      <div class="scroll-row flex items-start gap-1 overflow-x-auto px-2 py-4">
        <?php foreach ($categories as $cat): ?>
          <a href="/productos?categoria=<?= urlencode($cat['slug']) ?>"
             class="flex flex-col items-center gap-1.5 shrink-0 w-[78px] px-1 group">
            <span class="w-[60px] h-[60px] rounded-full bg-white text-primary flex items-center justify-center shadow-[0_2px_8px_rgba(32,28,78,0.06)] transition-colors group-hover:bg-primary group-hover:text-white">
              <iconify-icon icon="<?= getCategoryIcon($cat['name']) ?>" width="26" height="26"></iconify-icon>
            </span>
            <span class="text-[10px] font-semibold text-navy text-center leading-tight line-clamp-2">
              <?= htmlspecialchars($cat['name']) ?>
            </span>
          </a>
        <?php endforeach; ?>
      </div>
    </div>
  </nav>
  <?php endif; ?>

  <!-- ─── Desktop category bar — pills + "Categorías" trigger + mega-menu ─── -->
  <?php if (!empty($categories)):
    $pinnedCategories = array_slice($categories, 0, 7);
  ?>
  <nav id="mega-nav" class="hidden md:block bg-white border-b border-hairline sticky top-[84px] z-[100]">
    <div class="w-full max-w-[1280px] mx-auto px-5">
      <div class="scroll-row flex items-center gap-2 overflow-x-auto py-2.5">
        <button type="button" data-mega-trigger data-slug="__default__"
                class="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-bold text-white bg-primary transition-colors hover:bg-navy">
          <iconify-icon icon="lucide:layout-grid" width="14" height="14"></iconify-icon>
          Categorías
          <iconify-icon icon="lucide:chevron-down" width="13" height="13"></iconify-icon>
        </button>
        <?php foreach ($pinnedCategories as $cat): ?>
          <a href="/productos?categoria=<?= urlencode($cat['slug']) ?>"
             data-mega-trigger data-slug="<?= htmlspecialchars($cat['slug']) ?>"
             class="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium text-navy/80 transition-colors hover:bg-primary-light hover:text-primary">
            <iconify-icon icon="<?= getCategoryIcon($cat['name']) ?>" width="14" height="14" class="opacity-70"></iconify-icon>
            <?= htmlspecialchars($cat['name']) ?>
          </a>
        <?php endforeach; ?>
      </div>
    </div>
  </nav>

  <!-- Mega-menu: dark overlay + dropdown panel -->
  <div id="mega-overlay"
       class="hidden md:block fixed inset-0 bg-black/45 z-[95] opacity-0 pointer-events-none transition-opacity duration-200"></div>

  <div id="mega-panel"
       class="hidden md:block fixed left-0 right-0 z-[98] opacity-0 pointer-events-none transition-opacity duration-200"
       style="top: 140px;"
       data-default-slug="<?= htmlspecialchars($categories[0]['slug'] ?? '') ?>">
    <div class="w-full max-w-[1280px] mx-auto px-5">
      <div class="bg-white rounded-b-3xl shadow-[0_24px_60px_rgba(0,0,0,0.2)] grid grid-cols-[280px_1fr] max-h-[min(560px,65vh)] overflow-hidden">

        <!-- Left: full category list -->
        <aside class="border-r border-hairline overflow-y-auto py-3">
          <div class="text-[10px] font-bold uppercase tracking-[1.5px] text-muted px-5 pb-2 pt-2">Todas las categorías</div>
          <?php foreach ($categories as $cat): ?>
            <a href="/productos?categoria=<?= urlencode($cat['slug']) ?>"
               data-mega-sidebar data-slug="<?= htmlspecialchars($cat['slug']) ?>"
               class="flex items-center gap-3 px-5 py-2 text-[14px] text-navy/85 transition-colors hover:bg-primary-light hover:text-primary [&.is-active]:bg-primary-light [&.is-active]:text-primary [&.is-active]:font-semibold">
              <iconify-icon icon="<?= getCategoryIcon($cat['name']) ?>" width="16" height="16" class="opacity-70 shrink-0"></iconify-icon>
              <span class="truncate"><?= htmlspecialchars($cat['name']) ?></span>
            </a>
          <?php endforeach; ?>
        </aside>

        <!-- Right: product previews -->
        <div class="overflow-y-auto">
          <div class="flex items-center justify-between px-6 pt-5 pb-3">
            <h3 id="mega-panel-title" class="font-display text-[18px] font-semibold text-navy leading-none">Cargando...</h3>
            <a id="mega-panel-view-all" href="/productos" class="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-navy transition-colors">
              Ver todos
              <iconify-icon icon="lucide:arrow-right" width="13" height="13"></iconify-icon>
            </a>
          </div>
          <div id="mega-products" class="px-6 pb-6 grid grid-cols-3 gap-4">
            <!-- populated by mega-menu.js -->
          </div>
        </div>

      </div>
    </div>
  </div>
  <?php endif; ?>

  <!-- ─── Mobile drawer ─── -->
  <div id="mobile-menu"
       class="md:hidden bg-white border-b border-hairline shadow-[0_10px_30px_rgba(32,28,78,0.12)] animate-[fadeIn_0.2s_ease-out]"
       style="display:none;">
    <div class="max-h-[calc(100dvh-120px)] overflow-y-auto">
      <?php if (!empty($categories)): ?>
      <div class="px-5 pt-4 pb-2">
        <div class="text-[10px] font-bold uppercase tracking-[1.5px] text-muted mb-2">Categorías</div>
        <div class="flex flex-col">
          <?php foreach ($categories as $cat): ?>
            <a href="/productos?categoria=<?= urlencode($cat['slug']) ?>"
               class="flex items-center gap-3 py-2.5 text-navy text-[15px] font-medium transition-colors hover:text-primary">
              <span class="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0">
                <iconify-icon icon="<?= getCategoryIcon($cat['name']) ?>" width="16" height="16"></iconify-icon>
              </span>
              <?= htmlspecialchars($cat['name']) ?>
            </a>
          <?php endforeach; ?>
        </div>
      </div>
      <div class="border-t border-hairline"></div>
      <?php endif; ?>
      <div class="px-5 py-4 flex flex-col gap-3">
        <a href="/productos" class="flex items-center gap-2.5 text-navy text-[15px] font-semibold transition-colors hover:text-primary">
          <iconify-icon icon="lucide:package" width="18" height="18" class="text-primary"></iconify-icon>
          Todos los productos
        </a>
        <a href="/carrito" class="flex items-center gap-2.5 text-navy text-[15px] font-semibold transition-colors hover:text-primary">
          <iconify-icon icon="lucide:shopping-bag" width="18" height="18" class="text-primary"></iconify-icon>
          Carrito
        </a>
        <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener"
           class="flex items-center gap-2.5 text-navy text-[15px] font-semibold transition-colors hover:text-success">
          <iconify-icon icon="mdi:whatsapp" width="18" height="18" class="text-success"></iconify-icon>
          WhatsApp
        </a>
        <a href="<?= STORE_INSTAGRAM_URL ?>" target="_blank" rel="noopener"
           class="flex items-center gap-2.5 text-navy text-[15px] font-semibold transition-colors hover:text-primary">
          <iconify-icon icon="lucide:instagram" width="18" height="18" class="text-primary"></iconify-icon>
          Instagram
        </a>
      </div>
      <div class="border-t border-hairline px-5 py-4 flex flex-col gap-2 text-[13px] text-muted">
        <span class="inline-flex items-center gap-2">
          <iconify-icon icon="lucide:map-pin" width="14" height="14" class="text-primary"></iconify-icon>
          <?= STORE_ADDRESS ?>
        </span>
        <span class="inline-flex items-center gap-2">
          <iconify-icon icon="lucide:clock" width="14" height="14" class="text-primary"></iconify-icon>
          Lun a Sáb · 9 a 20
        </span>
      </div>
    </div>
  </div>

  <main class="flex-1">
