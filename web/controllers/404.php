<?php
$page_title = 'Página no encontrada — ' . SITE_NAME;
require __DIR__ . '/../includes/header.php';
?>

<section class="text-center px-4 py-[88px]">
  <div class="w-[120px] h-[120px] mx-auto mb-7 rounded-full bg-teal-wash text-teal grid place-items-center">
    <iconify-icon icon="mdi:paw" width="52" height="52"></iconify-icon>
  </div>
  <h1 class="text-[5rem] text-primary-light leading-none mb-2">404</h1>
  <h2 class="text-2xl mb-2.5">Página no encontrada</h2>
  <p class="text-muted mb-7">La página que buscás no existe o fue movida.</p>
  <a href="/"
     class="inline-flex items-center justify-center gap-2 px-7 py-[13px] text-[14px] font-semibold tracking-[0.3px] rounded-full border-2 border-primary bg-primary text-white transition-all hover:bg-navy hover:border-navy hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(64,15,255,0.28)]">
    <iconify-icon icon="lucide:home" width="16" height="16"></iconify-icon>
    Volver al inicio
  </a>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
