<?php
$page_title = 'Estamos con problemas — ' . SITE_NAME;
require __DIR__ . '/../includes/header.php';
?>

<section class="py-14">
  <div class="max-w-[1200px] mx-auto px-5">
    <div class="text-center px-4 py-[72px]">
      <div class="w-[100px] h-[100px] mx-auto mb-6 rounded-full bg-teal-wash text-teal grid place-items-center">
        <iconify-icon icon="lucide:alert-triangle" width="44" height="44"></iconify-icon>
      </div>
      <h1 class="text-2xl mb-3.5">Nuestro buscador está temporalmente fuera de servicio</h1>
      <p class="text-muted mb-8 max-w-[480px] mx-auto leading-relaxed">
        Estamos trabajando para solucionarlo. Mientras tanto, podés consultarnos el catálogo completo por WhatsApp.
      </p>
      <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>?text=<?= urlencode('Hola! Quiero consultar el catálogo de productos.') ?>"
         class="inline-flex items-center justify-center gap-2 px-9 py-4 text-[16px] font-bold tracking-[0.3px] rounded-full border-2 border-success bg-success text-white transition-all hover:bg-[#1EBE57] hover:border-[#1EBE57] hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(37,211,102,0.3)]">
        <iconify-icon icon="mdi:whatsapp" width="20" height="20"></iconify-icon>
        Consultar catálogo por WhatsApp
      </a>
    </div>
  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
