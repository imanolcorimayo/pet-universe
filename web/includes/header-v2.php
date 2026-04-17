<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($page_title ?? SITE_NAME) ?></title>
  <meta name="description" content="<?= htmlspecialchars($page_description ?? SITE_NAME . ' — ' . SITE_TAGLINE . '. Alimentos, accesorios y más para tu mascota en Córdoba.') ?>">

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

  <?php if (!empty($page_canonical)): ?>
  <link rel="canonical" href="<?= $page_canonical ?>">
  <?php endif; ?>

  <link rel="preload" as="image" href="<?= asset('img/hero/store-interior.jpeg') ?>">

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700&family=Caveat:wght@500;700&display=swap" rel="stylesheet">

  <!-- Iconify -->
  <script src="https://code.iconify.design/iconify-icon/2.3.0/iconify-icon.min.js"></script>

  <!-- Styles -->
  <link rel="stylesheet" href="<?= asset('css/style.css') ?>">

  <script>
  function imgFallback(img){var p=img.closest('picture');if(p){p.style.display='none';var f=p.nextElementSibling;if(f)f.style.display=''}}
  </script>
</head>
<body class="bg-paper text-ink antialiased min-h-dvh flex flex-col">

  <!-- Info strip -->
  <div class="bg-navy text-cream text-[12px] sm:text-[13px] font-medium">
    <div class="max-w-[1200px] mx-auto px-5 py-2 flex items-center justify-center gap-5 sm:gap-8 overflow-hidden">
      <span class="flex items-center gap-1.5 shrink-0">
        <iconify-icon icon="lucide:map-pin" width="13" height="13" class="text-teal"></iconify-icon>
        Luis Agote 1924, Córdoba
      </span>
      <span class="hidden sm:flex items-center gap-1.5 shrink-0">
        <iconify-icon icon="lucide:clock" width="13" height="13" class="text-teal"></iconify-icon>
        Lun a Sáb · 9 a 20 hs
      </span>
      <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener" class="hidden md:flex items-center gap-1.5 shrink-0 hover:text-teal transition-colors">
        <iconify-icon icon="mdi:whatsapp" width="13" height="13" class="text-teal"></iconify-icon>
        Escribinos por WhatsApp
      </a>
    </div>
  </div>

  <!-- Header — CSS-only toggles via hidden checkboxes + peer variants -->
  <header class="sticky top-0 z-50 bg-paper/90 backdrop-blur-md border-b border-ink/10">
    <!-- Toggles (direct siblings of the panels below) -->
    <input type="checkbox" id="search-toggle" class="peer/search hidden" aria-hidden="true">
    <input type="checkbox" id="menu-toggle"   class="peer/menu hidden"   aria-hidden="true">

    <div class="max-w-[1200px] mx-auto px-5 h-[68px] flex items-center justify-between gap-5">
      <a href="/" class="flex items-center gap-3 shrink-0 group">
        <img src="<?= asset('img/logo.png') ?>" alt="<?= SITE_NAME ?>"
             class="w-10 h-10 rounded-full object-cover ring-1 ring-ink/10 transition-transform group-hover:scale-105">
        <span class="font-display font-semibold text-[17px] tracking-tight text-ink hidden sm:inline leading-none">
          Pet Universe
          <span class="block font-hand text-rust text-base leading-none -mt-0.5">Córdoba</span>
        </span>
      </a>

      <nav class="flex-1 flex items-center justify-center gap-1">
        <a href="/productos" class="hidden md:inline-flex px-3 py-2 rounded-full text-sm font-semibold text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors">Productos</a>
        <a href="/#categorias" class="hidden md:inline-flex px-3 py-2 rounded-full text-sm font-semibold text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors">Categorías</a>
        <a href="/#local" class="hidden md:inline-flex px-3 py-2 rounded-full text-sm font-semibold text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors">El local</a>
      </nav>

      <div class="flex items-center gap-1">
        <label for="search-toggle" class="p-2 rounded-full text-ink hover:bg-ink/5 transition-colors cursor-pointer select-none" aria-label="Buscar">
          <iconify-icon icon="lucide:search" width="20" height="20"></iconify-icon>
        </label>
        <a href="/carrito" class="relative p-2 rounded-full text-ink hover:bg-ink/5 transition-colors" aria-label="Carrito">
          <iconify-icon icon="lucide:shopping-bag" width="20" height="20"></iconify-icon>
          <span id="cart-badge" class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rust text-paper text-[10px] font-bold rounded-full px-1 grid place-items-center" style="display:none;">0</span>
        </a>
        <label for="menu-toggle" class="md:hidden p-2 rounded-full text-ink hover:bg-ink/5 transition-colors cursor-pointer select-none" aria-label="Menú">
          <iconify-icon icon="lucide:menu" width="22" height="22"></iconify-icon>
        </label>
      </div>
    </div>

    <!-- Search bar — shown when #search-toggle is checked -->
    <div class="hidden peer-checked/search:block border-t border-ink/10 bg-paper-deep">
      <div class="max-w-[1200px] mx-auto px-5 py-3">
        <form action="/buscar" method="GET" class="flex items-center gap-2">
          <iconify-icon icon="lucide:search" width="18" height="18" class="text-ink-muted"></iconify-icon>
          <input type="text" name="q" id="search-input" placeholder="Buscar alimentos, accesorios…"
                 class="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-muted text-[15px]"
                 autocomplete="off" minlength="2" maxlength="100">
          <button type="submit" class="px-4 py-1.5 rounded-full bg-ink text-paper text-sm font-semibold hover:bg-navy transition-colors">Buscar</button>
          <label for="search-toggle" class="p-1.5 rounded-full text-ink-muted hover:bg-ink/5 transition-colors cursor-pointer select-none" aria-label="Cerrar">
            <iconify-icon icon="lucide:x" width="18" height="18"></iconify-icon>
          </label>
        </form>
        <div id="search-autocomplete" class="mt-2"></div>
      </div>
    </div>

    <!-- Mobile menu — shown when #menu-toggle is checked -->
    <div class="hidden peer-checked/menu:block md:hidden border-t border-ink/10 bg-paper">
      <a href="/productos" class="flex items-center gap-2.5 px-5 py-3 text-ink text-sm font-semibold hover:bg-ink/5">
        <iconify-icon icon="lucide:package" width="16" height="16" class="text-teal-deep"></iconify-icon> Productos
      </a>
      <a href="/#categorias" class="flex items-center gap-2.5 px-5 py-3 text-ink text-sm font-semibold hover:bg-ink/5">
        <iconify-icon icon="lucide:grid-2x2" width="16" height="16" class="text-teal-deep"></iconify-icon> Categorías
      </a>
      <a href="/#local" class="flex items-center gap-2.5 px-5 py-3 text-ink text-sm font-semibold hover:bg-ink/5">
        <iconify-icon icon="lucide:store" width="16" height="16" class="text-teal-deep"></iconify-icon> El local
      </a>
      <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener" class="flex items-center gap-2.5 px-5 py-3 text-ink text-sm font-semibold hover:bg-ink/5">
        <iconify-icon icon="mdi:whatsapp" width="16" height="16" class="text-teal-deep"></iconify-icon> WhatsApp
      </a>
    </div>
  </header>

  <main class="flex-1">
