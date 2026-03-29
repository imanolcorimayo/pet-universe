  </main>

  <!-- Footer -->
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <div class="footer-brand-logo">
          <span class="footer-brand-logo-icon">
            <iconify-icon icon="mdi:paw" width="18" height="18"></iconify-icon>
          </span>
          <span class="footer-logo"><?= SITE_NAME ?></span>
        </div>
        <p class="footer-tagline"><?= SITE_TAGLINE ?>. Alimentos, accesorios y todo para tu mascota en Córdoba.</p>
      </div>

      <div class="footer-links">
        <h4>Navegación</h4>
        <a href="/">
          <iconify-icon icon="lucide:home" width="14" height="14"></iconify-icon>
          Inicio
        </a>
        <a href="/productos">
          <iconify-icon icon="lucide:package" width="14" height="14"></iconify-icon>
          Productos
        </a>
        <a href="/carrito">
          <iconify-icon icon="lucide:shopping-bag" width="14" height="14"></iconify-icon>
          Carrito
        </a>
      </div>

      <div class="footer-contact">
        <h4>Contacto</h4>
        <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" target="_blank">
          <iconify-icon icon="mdi:whatsapp" width="16" height="16"></iconify-icon>
          WhatsApp
        </a>
        <a href="<?= STORE_INSTAGRAM_URL ?>" target="_blank">
          <iconify-icon icon="lucide:instagram" width="16" height="16"></iconify-icon>
          <?= STORE_INSTAGRAM ?>
        </a>
        <p>
          <iconify-icon icon="lucide:map-pin" width="14" height="14"></iconify-icon>
          <?= STORE_ADDRESS ?>
        </p>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container footer-bottom-inner">
        <p>&copy; <?= date('Y') ?> <?= SITE_NAME ?>. Todos los derechos reservados.</p>
        <span class="footer-credit">
          Desarrollado por <a href="https://wiseutils.com" target="_blank" rel="noopener">wiseutils.com</a>
        </span>
      </div>
    </div>
  </footer>

  <!-- WhatsApp FAB -->
  <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>" class="whatsapp-fab" target="_blank" aria-label="Contactar por WhatsApp">
    <iconify-icon icon="mdi:whatsapp" width="28" height="28"></iconify-icon>
  </a>

  <!-- Scripts -->
  <script src="<?= asset('js/cart.js') ?>"></script>
  <script src="<?= asset('js/search.js') ?>"></script>
  <script>
    // Header interactions
    document.getElementById('search-toggle')?.addEventListener('click', () => {
      const bar = document.getElementById('search-bar');
      bar.style.display = bar.style.display === 'none' ? 'block' : 'none';
      if (bar.style.display === 'block') document.getElementById('search-input').focus();
    });
    document.getElementById('search-close')?.addEventListener('click', () => {
      document.getElementById('search-bar').style.display = 'none';
    });
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
      const menu = document.getElementById('mobile-menu');
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });

    // Init cart badge on every page
    if (typeof updateCartBadge === 'function') updateCartBadge();

    // Scroll-triggered animations
    const scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          scrollObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.animate-on-scroll, .stagger-children').forEach(el => {
      scrollObserver.observe(el);
    });
  </script>
</body>
</html>
