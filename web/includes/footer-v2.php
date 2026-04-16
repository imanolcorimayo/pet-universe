  </main>

  <!-- Footer -->
  <footer class="bg-navy text-cream mt-20">
    <div class="max-w-[1200px] mx-auto px-5 pt-14 pb-10">
      <div class="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr] gap-10 md:gap-14">

        <!-- Brand block -->
        <div>
          <div class="flex items-center gap-3">
            <img src="<?= asset('img/logo.png') ?>" alt="<?= SITE_NAME ?>" class="w-11 h-11 rounded-full object-cover ring-1 ring-white/10">
            <div class="leading-tight">
              <div class="font-display text-lg font-semibold">Pet Universe</div>
              <div class="font-hand text-teal text-lg -mt-1">Córdoba</div>
            </div>
          </div>
          <p class="mt-4 text-cream/75 text-[14px] leading-relaxed max-w-sm">
            Un pet shop de barrio. Alimentos, accesorios y el consejo de siempre para tu mascota.
          </p>
          <div class="mt-5 flex items-center gap-2">
            <a href="<?= STORE_INSTAGRAM_URL ?>" target="_blank" rel="noopener" class="w-9 h-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 transition-colors" aria-label="Instagram">
              <iconify-icon icon="lucide:instagram" width="16" height="16" class="text-teal"></iconify-icon>
            </a>
            <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener" class="w-9 h-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 transition-colors" aria-label="WhatsApp">
              <iconify-icon icon="mdi:whatsapp" width="16" height="16" class="text-teal"></iconify-icon>
            </a>
          </div>
        </div>

        <!-- Nav -->
        <div>
          <div class="text-[11px] font-semibold tracking-[2px] uppercase text-teal/90 mb-4">Navegación</div>
          <div class="flex flex-col gap-2 text-[14px] text-cream/75">
            <a href="/" class="hover:text-cream transition-colors">Inicio</a>
            <a href="/productos" class="hover:text-cream transition-colors">Productos</a>
            <a href="/#categorias" class="hover:text-cream transition-colors">Categorías</a>
            <a href="/#local" class="hover:text-cream transition-colors">El local</a>
            <a href="/carrito" class="hover:text-cream transition-colors">Carrito</a>
          </div>
        </div>

        <!-- Contact — address-forward -->
        <div>
          <div class="text-[11px] font-semibold tracking-[2px] uppercase text-teal/90 mb-4">Pasá a vernos</div>
          <div class="font-display text-2xl font-semibold leading-tight">
            Luis Agote 1924<br>
            <span class="text-cream/70 text-lg font-normal">Córdoba, Argentina</span>
          </div>
          <div class="mt-4 flex flex-col gap-2 text-[14px] text-cream/75">
            <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener" class="flex items-center gap-2 hover:text-cream transition-colors">
              <iconify-icon icon="mdi:whatsapp" width="14" height="14" class="text-teal"></iconify-icon>
              +54 9 351 760 5708
            </a>
            <a href="<?= STORE_INSTAGRAM_URL ?>" target="_blank" rel="noopener" class="flex items-center gap-2 hover:text-cream transition-colors">
              <iconify-icon icon="lucide:instagram" width="14" height="14" class="text-teal"></iconify-icon>
              <?= STORE_INSTAGRAM ?>
            </a>
            <span class="flex items-center gap-2 text-cream/60">
              <iconify-icon icon="lucide:clock" width="14" height="14" class="text-teal"></iconify-icon>
              Lun a Sáb · 9 a 20
            </span>
          </div>
        </div>
      </div>

      <div class="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-cream/50">
        <p>&copy; <?= date('Y') ?> <?= SITE_NAME ?>. Todos los derechos reservados.</p>
        <p>Desarrollado por <a href="https://wiseutils.com" target="_blank" rel="noopener" class="text-cream/75 hover:text-teal transition-colors">wiseutils.com</a></p>
      </div>
    </div>
  </footer>

  <!-- WhatsApp FAB -->
  <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener"
     class="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white grid place-items-center shadow-[0_8px_24px_rgba(37,211,102,0.35)] hover:scale-110 transition-transform"
     aria-label="Contactar por WhatsApp">
    <iconify-icon icon="mdi:whatsapp" width="26" height="26"></iconify-icon>
  </a>

  <script src="<?= asset('js/cart.js') ?>"></script>
  <script src="<?= asset('js/search.js') ?>"></script>
  <script>if (typeof updateCartBadge === 'function') updateCartBadge();</script>
</body>
</html>
