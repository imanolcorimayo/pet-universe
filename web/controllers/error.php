<?php
$page_title = 'Estamos con problemas — ' . SITE_NAME;
require __DIR__ . '/../includes/header-v4.php';
?>

<section class="py-12 md:py-20">
  <div class="w-full max-w-[620px] mx-auto px-5 text-center">
    <div class="inline-flex items-center justify-center w-[96px] h-[96px] mb-6 rounded-full bg-teal-wash text-teal-deep">
      <iconify-icon icon="lucide:alert-triangle" width="44" height="44"></iconify-icon>
    </div>
    <h1 class="font-display text-[22px] md:text-[28px] font-semibold text-navy mb-3 leading-tight">
      Nuestro buscador está temporalmente fuera de servicio
    </h1>
    <p class="text-muted text-[14.5px] leading-relaxed mb-7 max-w-[460px] mx-auto">
      Estamos trabajando para solucionarlo. Mientras tanto, podés consultarnos el catálogo completo por WhatsApp.
    </p>
    <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>?text=<?= urlencode('Hola! Quiero consultar el catálogo de productos.') ?>"
       target="_blank" rel="noopener"
       class="inline-flex items-center justify-center gap-2 px-8 py-[13px] text-[14.5px] font-bold tracking-[0.3px] rounded-full bg-success text-white transition-all hover:bg-[#1EBE57] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(37,211,102,0.32)]">
      <iconify-icon icon="mdi:whatsapp" width="18" height="18"></iconify-icon>
      Consultar catálogo por WhatsApp
    </a>
  </div>
</section>

<?php require __DIR__ . '/../includes/footer-v4.php'; ?>
