  </main>

  <footer class="bg-navy text-white/85 mt-auto">
    <div class="w-full max-w-[1280px] mx-auto px-5">
      <div class="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-8 md:gap-14 pt-11 md:pt-14 pb-7 md:pb-9">

        <div>
          <div class="flex items-center gap-3 mb-4">
            <img src="<?= asset('img/logo.png') ?>" alt="<?= SITE_NAME ?>"
                 class="w-12 h-12 rounded-full object-cover shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
            <div class="flex flex-col leading-[1.15]">
              <span class="font-display text-[20px] font-semibold text-white"><?= SITE_NAME ?></span>
              <span class="text-teal text-[13px] font-medium mt-0.5"><?= SITE_TAGLINE ?></span>
            </div>
          </div>
          <p class="text-[14px] text-white/60 leading-relaxed max-w-[360px]">
            Pet shop de barrio. Alimentos, accesorios y atención personalizada en Luis Agote 1924, Córdoba.
          </p>
          <div class="flex gap-2 mt-5">
            <a href="<?= STORE_INSTAGRAM_URL ?>" target="_blank" rel="noopener" aria-label="Instagram"
               class="w-9 h-9 rounded-full bg-white/5 text-teal inline-flex items-center justify-center transition-all hover:bg-white/15 hover:-translate-y-px">
              <iconify-icon icon="lucide:instagram" width="16" height="16"></iconify-icon>
            </a>
            <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener" aria-label="WhatsApp"
               class="w-9 h-9 rounded-full bg-white/5 text-teal inline-flex items-center justify-center transition-all hover:bg-white/15 hover:-translate-y-px">
              <iconify-icon icon="mdi:whatsapp" width="16" height="16"></iconify-icon>
            </a>
          </div>
        </div>

        <div class="flex flex-col">
          <h4 class="text-[11px] font-bold uppercase tracking-[2px] text-teal mb-4 opacity-90">Tienda</h4>
          <a href="/" class="text-white/70 text-[14px] py-1 transition-colors hover:text-white">Inicio</a>
          <a href="/productos" class="text-white/70 text-[14px] py-1 transition-colors hover:text-white">Productos</a>
          <a href="/productos?oferta=1" class="text-white/70 text-[14px] py-1 transition-colors hover:text-white">Ofertas</a>
          <a href="/carrito" class="text-white/70 text-[14px] py-1 transition-colors hover:text-white">Carrito</a>
        </div>

        <div class="flex flex-col">
          <h4 class="text-[11px] font-bold uppercase tracking-[2px] text-teal mb-4 opacity-90">Contacto</h4>
          <span class="flex items-center gap-2 text-white/70 text-[14px] py-1">
            <iconify-icon icon="lucide:map-pin" width="14" height="14" class="text-teal"></iconify-icon>
            <?= STORE_ADDRESS ?>
          </span>
          <span class="flex items-center gap-2 text-white/70 text-[14px] py-1">
            <iconify-icon icon="lucide:clock" width="14" height="14" class="text-teal"></iconify-icon>
            Lun a Sáb · 9 a 20
          </span>
          <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener"
             class="flex items-center gap-2 text-white/70 text-[14px] py-1 transition-colors hover:text-white">
            <iconify-icon icon="mdi:whatsapp" width="14" height="14" class="text-teal"></iconify-icon>
            +54 9 351 760 5708
          </a>
          <a href="<?= STORE_INSTAGRAM_URL ?>" target="_blank" rel="noopener"
             class="flex items-center gap-2 text-white/70 text-[14px] py-1 transition-colors hover:text-white">
            <iconify-icon icon="lucide:instagram" width="14" height="14" class="text-teal"></iconify-icon>
            <?= STORE_INSTAGRAM ?>
          </a>
        </div>
      </div>

      <div class="border-t border-white/10 py-5 flex flex-col md:flex-row items-start md:items-center justify-between flex-wrap gap-1.5 md:gap-3">
        <p class="text-xs text-white/50">&copy; <?= date('Y') ?> <?= SITE_NAME ?>. Todos los derechos reservados.</p>
        <p class="text-xs text-white/50">Desarrollado por <a href="https://wiseutils.com" target="_blank" rel="noopener" class="text-white/70 transition-colors hover:text-teal">wiseutils.com</a></p>
      </div>
    </div>
  </footer>

  <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" aria-label="Contactar por WhatsApp"
     class="fixed bottom-5 right-5 md:bottom-6 md:right-6 w-[54px] h-[54px] md:w-[58px] md:h-[58px] rounded-full bg-success text-white flex items-center justify-center shadow-[0_4px_16px_rgba(37,211,102,0.35)] transition-all z-[90] hover:scale-110 hover:shadow-[0_6px_24px_rgba(37,211,102,0.45)]">
    <iconify-icon icon="mdi:whatsapp" width="26" height="26"></iconify-icon>
  </a>

  <script>
    window.PETU_CONFIG = {
      whatsappNumber: '<?= WHATSAPP_NUMBER ?>',
    };
  </script>
  <script src="<?= asset('js/cart.js') ?>"></script>
  <script src="<?= asset('js/search.js') ?>"></script>
  <script src="<?= asset('js/mega-menu.js') ?>"></script>
  <script>
    // Header interactions
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
      const menu = document.getElementById('mobile-menu');
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });

    // Init cart badges (desktop + mobile)
    if (typeof updateCartBadge === 'function') updateCartBadge();
  </script>
</body>
</html>
