      </main>

    </div> <!-- /max-w wrapper -->
  </div>   <!-- /white sheet -->

  <!-- Footer band on the purple stage -->
  <footer class="bg-purple-deep text-paper relative overflow-hidden">
    <div class="absolute -right-10 -bottom-10 text-paper/[0.06] pointer-events-none" aria-hidden="true">
      <iconify-icon icon="mdi:paw" width="280" height="280"></iconify-icon>
    </div>

    <div class="relative max-w-[1280px] mx-auto px-6 sm:px-10 py-14">
      <div class="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10 md:gap-14">

        <!-- Brand -->
        <div>
          <div class="flex items-center gap-3">
            <img src="<?= asset('img/logo.png') ?>" alt="<?= SITE_NAME ?>" class="w-12 h-12 rounded-full ring-2 ring-yellow object-cover">
            <div class="leading-none">
              <div class="font-chunky font-extrabold text-[22px] text-paper">Pet Universe</div>
              <div class="text-[11px] font-semibold tracking-[2px] uppercase text-yellow mt-0.5">Córdoba</div>
            </div>
          </div>
          <p class="mt-4 text-paper/70 text-[14px] leading-relaxed max-w-sm">
            Alimentos, accesorios y asesoramiento real para tu mascota. Un pet shop de barrio, con todo lo que necesitás en un solo lugar.
          </p>
          <div class="mt-5 flex items-center gap-2">
            <a href="<?= STORE_INSTAGRAM_URL ?>" target="_blank" rel="noopener" class="w-10 h-10 grid place-items-center rounded-full bg-paper/10 hover:bg-yellow hover:text-purple-deep transition-colors" aria-label="Instagram">
              <iconify-icon icon="lucide:instagram" width="18" height="18"></iconify-icon>
            </a>
            <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener" class="w-10 h-10 grid place-items-center rounded-full bg-paper/10 hover:bg-yellow hover:text-purple-deep transition-colors" aria-label="WhatsApp">
              <iconify-icon icon="mdi:whatsapp" width="18" height="18"></iconify-icon>
            </a>
          </div>
        </div>

        <!-- Nav -->
        <div>
          <div class="font-chunky font-bold text-[15px] text-yellow mb-4">Navegación</div>
          <div class="flex flex-col gap-2 text-[14px] text-paper/70">
            <a href="/" class="hover:text-paper transition-colors">Inicio</a>
            <a href="/productos" class="hover:text-paper transition-colors">Productos</a>
            <a href="/#categorias" class="hover:text-paper transition-colors">Categorías populares</a>
            <a href="/#bestsellers" class="hover:text-paper transition-colors">Hits de ventas</a>
            <a href="/carrito" class="hover:text-paper transition-colors">Carrito</a>
          </div>
        </div>

        <!-- Contact -->
        <div>
          <div class="font-chunky font-bold text-[15px] text-yellow mb-4">Visitanos</div>
          <div class="font-chunky text-[22px] font-bold text-paper leading-tight">
            Luis Agote 1924<br>
            <span class="text-paper/70 text-[16px] font-medium">Córdoba, Argentina</span>
          </div>
          <div class="mt-4 flex flex-col gap-2 text-[14px] text-paper/70">
            <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener" class="flex items-center gap-2 hover:text-paper transition-colors">
              <iconify-icon icon="mdi:whatsapp" width="14" height="14" class="text-yellow"></iconify-icon>
              +54 9 351 760 5708
            </a>
            <span class="flex items-center gap-2">
              <iconify-icon icon="lucide:clock" width="14" height="14" class="text-yellow"></iconify-icon>
              Lun a Sáb · 10 a 20 hs
            </span>
            <a href="<?= STORE_INSTAGRAM_URL ?>" target="_blank" rel="noopener" class="flex items-center gap-2 hover:text-paper transition-colors">
              <iconify-icon icon="lucide:instagram" width="14" height="14" class="text-yellow"></iconify-icon>
              <?= STORE_INSTAGRAM ?>
            </a>
          </div>
        </div>
      </div>

      <div class="mt-12 pt-6 border-t border-paper/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-paper/50">
        <p>&copy; <?= date('Y') ?> <?= SITE_NAME ?>. Todos los derechos reservados.</p>
        <p>Desarrollado por <a href="https://wiseutils.com" target="_blank" rel="noopener" class="text-paper/75 hover:text-yellow transition-colors">wiseutils.com</a></p>
      </div>
    </div>
  </footer>

  <!-- WhatsApp FAB — yellow on purple stage -->
  <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank" rel="noopener"
     class="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-yellow text-purple-deep grid place-items-center shadow-[0_8px_24px_rgba(255,217,61,0.45)] hover:scale-110 transition-transform"
     aria-label="Contactar por WhatsApp">
    <iconify-icon icon="mdi:whatsapp" width="26" height="26"></iconify-icon>
  </a>

  <script src="<?= asset('js/cart.js') ?>"></script>
  <script src="<?= asset('js/search.js') ?>"></script>
  <script>if (typeof updateCartBadge === 'function') updateCartBadge();</script>
</body>
</html>
