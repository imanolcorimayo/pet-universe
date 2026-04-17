<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($page_title ?? SITE_NAME) ?></title>
  <meta name="description" content="<?= htmlspecialchars($page_description ?? SITE_NAME . ' — ' . SITE_TAGLINE . '. Alimentos, accesorios y más para tu mascota en Córdoba.') ?>">

  <meta property="og:title" content="<?= htmlspecialchars($page_title ?? SITE_NAME) ?>">
  <meta property="og:description" content="<?= htmlspecialchars($page_description ?? SITE_NAME . ' — ' . SITE_TAGLINE) ?>">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_AR">
  <?php if (!empty($page_og_image)): ?>
  <meta property="og:image" content="<?= $page_og_image ?>">
  <?php endif; ?>

  <?php if (!empty($page_canonical)): ?>
  <link rel="canonical" href="<?= $page_canonical ?>">
  <?php endif; ?>

  <link rel="preload" as="image" href="<?= asset('img/hero/store-dog-logo.jpeg') ?>">

  <!-- Fonts — v3: Baloo 2 chunky display + DM Sans body -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Baloo+2:wght@500;600;700;800&display=swap" rel="stylesheet">

  <script src="https://code.iconify.design/iconify-icon/2.3.0/iconify-icon.min.js"></script>
  <link rel="stylesheet" href="<?= asset('css/style.css') ?>">

  <script>
  function imgFallback(img){var p=img.closest('picture');if(p){p.style.display='none';var f=p.nextElementSibling;if(f)f.style.display=''}}
  </script>
</head>
<body class="bg-purple text-ink antialiased min-h-dvh relative overflow-x-hidden">

  <!-- Decorative pet silhouettes in the purple top band (desktop only) -->
  <div class="pointer-events-none select-none hidden xl:block absolute inset-x-0 top-0 h-[110px] text-paper/[0.18] z-0" aria-hidden="true">
    <iconify-icon icon="lucide:fish"  width="52" height="52" class="absolute top-[30px] left-[4%]"></iconify-icon>
    <iconify-icon icon="mdi:dog-side" width="64" height="64" class="absolute top-[18px] right-[30%]"></iconify-icon>
    <iconify-icon icon="mdi:cat"      width="56" height="56" class="absolute top-[26px] right-[22%]"></iconify-icon>
    <iconify-icon icon="lucide:bird"  width="52" height="52" class="absolute top-[30px] right-[14%]"></iconify-icon>
    <iconify-icon icon="mdi:rabbit"   width="60" height="60" class="absolute top-[22px] right-[5%]"></iconify-icon>
    <iconify-icon icon="mdi:paw"      width="40" height="40" class="absolute top-[46px] left-[24%]"></iconify-icon>
  </div>

  <!-- Full-width white sheet — purple only shows as a top band + footer -->
  <div class="bg-paper relative z-10">

    <!-- Inner max-width wrapper for all content -->
    <div class="max-w-[1280px] mx-auto">

      <!-- Utility nav strip (dense functional links) -->
      <nav class="hidden md:flex items-center justify-end gap-6 px-8 py-4 border-b border-ink/10 text-[12.5px] text-ink-soft">
        <a href="/" class="hover:text-purple-deep transition-colors">Inicio</a>
        <a href="/#local" class="hover:text-purple-deep transition-colors">Consejos</a>
        <a href="/#envios" class="hover:text-purple-deep transition-colors">Envíos</a>
        <a href="/#preguntas" class="hover:text-purple-deep transition-colors">Preguntas frecuentes</a>
        <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener" class="hover:text-purple-deep transition-colors">Contacto</a>
        <a href="/carrito" class="hover:text-purple-deep transition-colors flex items-center gap-1.5">
          <iconify-icon icon="lucide:shopping-bag" width="14" height="14"></iconify-icon>
          Carrito
        </a>
      </nav>

      <!-- Main header: logo + phone + address + Ofertas CTA -->
      <header class="px-5 sm:px-8 pt-5 pb-4 flex items-center justify-between gap-3">
        <a href="/" class="flex items-center gap-2.5 sm:gap-3 group min-w-0">
          <img src="<?= asset('img/logo.png') ?>" alt="<?= SITE_NAME ?>"
               class="w-11 h-11 sm:w-12 sm:h-12 rounded-full ring-2 ring-purple-wash object-cover transition-transform group-hover:scale-105 shrink-0">
          <div class="leading-none min-w-0">
            <div class="font-chunky font-extrabold text-[20px] sm:text-[26px] tracking-tight text-purple-deep truncate">Pet Universe</div>
            <div class="hidden sm:block text-[11px] font-semibold tracking-[2px] uppercase text-ink-muted mt-0.5">Córdoba · Tienda de mascotas</div>
            <div class="sm:hidden text-[10px] font-semibold tracking-[1.5px] uppercase text-ink-muted mt-0.5">Córdoba</div>
          </div>
        </a>

        <div class="hidden lg:flex items-center gap-8">
          <div class="flex items-center gap-2.5">
            <span class="w-10 h-10 rounded-full bg-purple-wash grid place-items-center">
              <iconify-icon icon="lucide:phone" width="18" height="18" class="text-purple-deep"></iconify-icon>
            </span>
            <div class="leading-tight">
              <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" class="font-chunky font-bold text-[17px] text-ink hover:text-purple-deep transition-colors">+54 9 351 760 5708</a>
              <div class="text-[11px] text-ink-muted">Lun a Sáb · 10 a 20 hs</div>
            </div>
          </div>
          <div class="flex items-center gap-2.5">
            <span class="w-10 h-10 rounded-full bg-purple-wash grid place-items-center">
              <iconify-icon icon="lucide:map-pin" width="18" height="18" class="text-purple-deep"></iconify-icon>
            </span>
            <div class="leading-tight">
              <div class="font-chunky font-bold text-[15px] text-ink">Luis Agote 1924</div>
              <div class="text-[11px] text-ink-muted">Córdoba capital</div>
            </div>
          </div>
        </div>

        <a href="#ofertas" class="inline-flex items-center gap-1.5 sm:gap-2 border-2 border-purple text-purple-deep font-chunky font-bold rounded-full px-3.5 sm:px-5 py-2 sm:py-2.5 text-[13px] sm:text-[14px] hover:bg-purple hover:text-paper transition-colors shrink-0">
          Ofertas
          <iconify-icon icon="lucide:gift" width="16" height="16"></iconify-icon>
        </a>
      </header>

      <!-- Search row: Catálogo pill + search field + submit -->
      <div class="px-5 sm:px-8 pb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <a href="#categorias" class="inline-flex items-center justify-center gap-2 bg-yellow text-ink font-chunky font-bold rounded-full px-5 sm:px-6 py-3 text-[14px] sm:text-[15px] hover:bg-yellow-deep transition-colors shrink-0 self-start sm:self-auto">
          <iconify-icon icon="lucide:menu" width="18" height="18"></iconify-icon>
          Catálogo
        </a>
        <form action="/buscar" method="GET" class="flex-1 flex items-center gap-2 sm:gap-3">
          <div class="flex-1 min-w-0 flex items-center gap-2 bg-white border border-ink/10 rounded-full px-4 sm:px-5 py-3 focus-within:border-purple focus-within:ring-2 focus-within:ring-purple-wash transition-all">
            <iconify-icon icon="lucide:search" width="18" height="18" class="text-ink-muted shrink-0"></iconify-icon>
            <input type="text" name="q" placeholder="¿Qué querés para tu mascota?"
                   class="flex-1 min-w-0 bg-transparent outline-none text-ink placeholder:text-ink-muted text-[14px]"
                   autocomplete="off" minlength="2" maxlength="100">
          </div>
          <button type="submit" class="inline-flex items-center gap-1.5 sm:gap-2 bg-purple text-paper font-chunky font-bold rounded-full px-4 sm:px-6 py-3 text-[14px] sm:text-[15px] hover:bg-purple-deep transition-colors shrink-0">
            Buscar
            <iconify-icon icon="lucide:arrow-right" width="16" height="16"></iconify-icon>
          </button>
        </form>
      </div>

      <main>
