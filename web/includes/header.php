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

  <!-- Canonical -->
  <?php if (!empty($page_canonical)): ?>
  <link rel="canonical" href="<?= $page_canonical ?>">
  <?php endif; ?>

  <!-- Preload hero image -->
  <link rel="preload" as="image" type="image/webp" href="<?= asset('img/hero/kitten-golden.webp') ?>">

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
<body>

  <!-- Header -->
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="header-logo">
        <span class="logo-icon">
          <iconify-icon icon="mdi:paw" width="20" height="20"></iconify-icon>
        </span>
        <span class="logo-text"><?= SITE_NAME ?></span>
      </a>

      <nav class="header-nav" id="main-nav">
        <a href="/productos" class="nav-link">Productos</a>
      </nav>

      <div class="header-actions">
        <!-- Search toggle -->
        <button class="icon-btn" id="search-toggle" aria-label="Buscar">
          <iconify-icon icon="lucide:search" width="20" height="20"></iconify-icon>
        </button>

        <!-- Cart -->
        <a href="/carrito" class="icon-btn cart-btn" aria-label="Carrito">
          <iconify-icon icon="lucide:shopping-bag" width="20" height="20"></iconify-icon>
          <span class="cart-badge" id="cart-badge" style="display:none;">0</span>
        </a>

        <!-- Mobile menu toggle -->
        <button class="icon-btn mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Menú">
          <iconify-icon icon="lucide:menu" width="22" height="22"></iconify-icon>
        </button>
      </div>
    </div>

    <!-- Search bar (hidden by default) -->
    <div class="search-bar" id="search-bar" style="display:none;">
      <div class="container">
        <form action="/buscar" method="GET" class="search-form">
          <input type="text" name="q" id="search-input" placeholder="Buscar productos..." autocomplete="off" minlength="2" maxlength="100">
          <button type="submit" class="search-submit">Buscar</button>
          <button type="button" class="search-close" id="search-close" aria-label="Cerrar">
            <iconify-icon icon="lucide:x" width="20" height="20"></iconify-icon>
          </button>
        </form>
        <div class="search-autocomplete" id="search-autocomplete"></div>
      </div>
    </div>

    <!-- Mobile menu -->
    <div class="mobile-menu" id="mobile-menu" style="display:none;">
      <a href="/productos" class="mobile-menu-link">
        <iconify-icon icon="lucide:package" width="18" height="18"></iconify-icon>
        Productos
      </a>
      <a href="/carrito" class="mobile-menu-link">
        <iconify-icon icon="lucide:shopping-bag" width="18" height="18"></iconify-icon>
        Carrito
      </a>
      <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" class="mobile-menu-link" target="_blank">
        <iconify-icon icon="mdi:whatsapp" width="18" height="18"></iconify-icon>
        WhatsApp
      </a>
    </div>
  </header>

  <main>
