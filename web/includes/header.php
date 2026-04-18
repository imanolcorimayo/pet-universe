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

  <!-- Open Graph -->
  <meta property="og:title" content="<?= htmlspecialchars($page_title ?? SITE_NAME) ?>">
  <meta property="og:description" content="<?= htmlspecialchars($page_description ?? SITE_NAME . ' — ' . SITE_TAGLINE) ?>">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_AR">
  <?php if (!empty($page_og_image)): ?>
  <meta property="og:image" content="<?= $page_og_image ?>">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="1200">
  <?php endif; ?>

  <!-- Canonical -->
  <?php if (!empty($page_canonical)): ?>
  <link rel="canonical" href="<?= $page_canonical ?>">
  <?php endif; ?>

  <!-- Preload hero -->
  <link rel="preload" as="image" href="<?= asset('img/hero/store-interior.webp') ?>" imagesrcset="<?= asset('img/hero/store-interior-sm.webp') ?> 800w, <?= asset('img/hero/store-interior.webp') ?> 1600w" imagesizes="100vw" type="image/webp">

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&display=swap" rel="stylesheet">

  <!-- Iconify -->
  <script src="https://code.iconify.design/iconify-icon/2.3.0/iconify-icon.min.js"></script>

  <!-- Styles -->
  <link rel="stylesheet" href="<?= asset('css/style.css') ?>">

  <script>
  function imgFallback(img){var p=img.closest('picture');if(p){p.style.display='none';var f=p.nextElementSibling;if(f)f.style.display=''}}
  </script>
</head>
<body class="bg-canvas text-navy min-h-dvh flex flex-col antialiased">

  <header class="bg-navy text-white sticky top-0 z-[100] shadow-[0_2px_20px_rgba(32,28,78,0.15)]">
    <div class="w-full max-w-[1200px] mx-auto px-5 flex items-center justify-between gap-5 h-[60px] md:h-[68px]">
      <a href="/" class="group flex items-center gap-3 text-white font-display font-semibold text-[22px] tracking-[0.3px] whitespace-nowrap transition-colors hover:text-teal">
        <img src="<?= asset('img/logo.png') ?>" alt="<?= SITE_NAME ?>" class="w-11 h-auto rounded-full transition-transform group-hover:scale-[1.08]">
        <span><?= SITE_NAME ?></span>
      </a>

      <nav id="main-nav" class="hidden md:flex gap-7">
        <a href="/productos"
           class="relative text-white/80 font-semibold text-[14px] tracking-[0.4px] transition-colors hover:text-white after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-teal after:rounded-[1px] after:transition-[width] hover:after:w-full">
          Productos
        </a>
      </nav>

      <div class="flex items-center gap-2">
        <button id="search-toggle" aria-label="Buscar"
                class="flex items-center text-white p-2 rounded-xl transition-colors hover:bg-white/10">
          <iconify-icon icon="lucide:search" width="20" height="20"></iconify-icon>
        </button>

        <a href="/carrito" aria-label="Carrito"
           class="relative flex items-center text-white p-2 rounded-xl transition-colors hover:bg-white/10">
          <iconify-icon icon="lucide:shopping-bag" width="20" height="20"></iconify-icon>
          <span id="cart-badge"
                class="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-teal text-navy text-[10px] font-bold flex items-center justify-center border-2 border-navy"
                style="display:none;">0</span>
        </a>

        <button id="mobile-menu-toggle" aria-label="Menú"
                class="flex md:hidden items-center text-white p-2 rounded-xl transition-colors hover:bg-white/10">
          <iconify-icon icon="lucide:menu" width="22" height="22"></iconify-icon>
        </button>
      </div>
    </div>

    <div id="search-bar"
         class="bg-primary py-3.5 border-t border-white/10 animate-[fadeIn_0.3s_ease-out]"
         style="display:none;">
      <div class="w-full max-w-[1200px] mx-auto px-5">
        <form action="/buscar" method="GET" class="flex gap-2 relative">
          <input type="text" name="q" id="search-input"
                 placeholder="Buscar productos..." autocomplete="off" minlength="2" maxlength="100"
                 class="flex-1 py-3 px-[18px] rounded-full border-2 border-transparent text-[15px] outline-none bg-white transition-colors focus:border-teal">
          <button type="submit"
                  class="py-3 px-6 bg-teal text-white font-semibold rounded-full text-[14px] transition-all hover:bg-teal-deep hover:shadow-[0_6px_24px_rgba(0,206,206,0.25)]">
            Buscar
          </button>
          <button type="button" id="search-close" aria-label="Cerrar"
                  class="flex items-center text-white p-2 rounded-full transition-colors hover:bg-white/10">
            <iconify-icon icon="lucide:x" width="20" height="20"></iconify-icon>
          </button>
        </form>
        <div id="search-autocomplete"
             class="empty:hidden bg-white rounded-xl shadow-[0_12px_40px_rgba(32,28,78,0.1)] overflow-hidden mt-2"></div>
      </div>
    </div>

    <div id="mobile-menu"
         class="bg-primary border-t border-white/10 py-2 animate-[fadeIn_0.2s_ease-out]"
         style="display:none;">
      <a href="/productos"
         class="flex items-center gap-2.5 py-3.5 px-6 text-white font-semibold text-[15px] transition-colors hover:bg-white/10">
        <iconify-icon icon="lucide:package" width="18" height="18"></iconify-icon>
        Productos
      </a>
      <a href="/carrito"
         class="flex items-center gap-2.5 py-3.5 px-6 text-white font-semibold text-[15px] transition-colors hover:bg-white/10">
        <iconify-icon icon="lucide:shopping-bag" width="18" height="18"></iconify-icon>
        Carrito
      </a>
      <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank"
         class="flex items-center gap-2.5 py-3.5 px-6 text-white font-semibold text-[15px] transition-colors hover:bg-white/10">
        <iconify-icon icon="mdi:whatsapp" width="18" height="18"></iconify-icon>
        WhatsApp
      </a>
    </div>
  </header>

  <main class="flex-1">
