<?php
$page_title       = '¡Pedido enviado! — ' . SITE_NAME;
$page_description = 'Recibimos tu pedido por WhatsApp. Te respondemos a la brevedad.';
require __DIR__ . '/../includes/header.php';
?>

<section class="py-12 md:py-20">
  <div class="w-full max-w-[620px] mx-auto px-5 text-center">
    <div class="inline-flex items-center justify-center w-[96px] h-[96px] mb-6 rounded-full bg-success/10 text-success">
      <iconify-icon icon="lucide:check" width="44" height="44"></iconify-icon>
    </div>
    <h1 class="font-display text-[28px] md:text-[36px] font-semibold text-navy mb-2.5">¡Pedido enviado!</h1>
    <p class="text-muted text-[14.5px] leading-relaxed mb-7 max-w-[460px] mx-auto">
      Recibimos tu mensaje por WhatsApp. Te respondemos a la brevedad para confirmar el pedido y coordinar entrega o retiro.
    </p>

    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
      <a href="/productos"
         class="inline-flex items-center justify-center gap-2 px-6 py-3 text-[14px] font-semibold tracking-[0.3px] rounded-full border-2 border-primary bg-primary text-white transition-all hover:bg-navy hover:border-navy hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(64,15,255,0.28)]">
        <iconify-icon icon="lucide:package" width="16" height="16"></iconify-icon>
        Seguir comprando
      </a>
      <a href="/"
         class="inline-flex items-center justify-center gap-2 px-6 py-3 text-[14px] font-semibold tracking-[0.3px] rounded-full border border-hairline bg-white text-navy transition-all hover:border-primary hover:text-primary">
        <iconify-icon icon="lucide:home" width="16" height="16"></iconify-icon>
        Volver al inicio
      </a>
    </div>
  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
