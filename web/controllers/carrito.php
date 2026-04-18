<?php
$page_title = 'Carrito — ' . SITE_NAME;
require __DIR__ . '/../includes/header.php';
?>

<section class="py-8 md:py-10">
  <div class="w-full max-w-[1200px] mx-auto px-5">

    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-[12.5px] text-muted mb-6 flex-wrap">
      <a href="/" class="text-muted transition-colors hover:text-primary">Inicio</a>
      <iconify-icon icon="lucide:chevron-right" width="12" height="12" class="opacity-40"></iconify-icon>
      <span class="text-navy">Carrito</span>
    </nav>

    <!-- Title -->
    <div class="flex items-end justify-between flex-wrap gap-4 mb-8">
      <div>
        <h1 class="font-display text-[32px] md:text-[42px] font-semibold text-navy leading-[1.05]">Tu carrito</h1>
        <p id="cart-subtitle" class="text-[13.5px] text-muted mt-2">Cargando…</p>
      </div>
      <a href="/productos" id="cart-continue-top"
         class="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:text-navy transition-colors"
         style="display:none;">
        <iconify-icon icon="lucide:arrow-left" width="14" height="14"></iconify-icon>
        Seguir comprando
      </a>
    </div>

    <!-- ─── Empty state ──────────────────────────────── -->
    <div id="cart-empty" class="text-center px-4 py-14 md:py-20 bg-white rounded-2xl border border-hairline" style="display:none;">
      <div class="inline-flex items-center justify-center w-[88px] h-[88px] mx-auto mb-5 rounded-full bg-primary-light text-primary">
        <iconify-icon icon="lucide:shopping-bag" width="40" height="40"></iconify-icon>
      </div>
      <h2 class="font-display text-[22px] md:text-[26px] font-semibold text-navy mb-2">Tu carrito está vacío</h2>
      <p class="text-muted mb-6 text-[14.5px]">Agregá productos para comenzar tu pedido.</p>
      <a href="/productos"
         class="inline-flex items-center justify-center gap-2 px-6 py-3 text-[14px] font-semibold tracking-[0.3px] rounded-full border-2 border-primary bg-primary text-white transition-all hover:bg-navy hover:border-navy hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(64,15,255,0.28)]">
        <iconify-icon icon="lucide:package" width="16" height="16"></iconify-icon>
        Ver productos
      </a>
    </div>

    <!-- ─── Filled state: items + summary ────────────── -->
    <div id="cart-filled" class="grid lg:grid-cols-[1.5fr_1fr] gap-8 items-start" style="display:none;">

      <div class="flex flex-col gap-3">
        <div id="cart-items" class="flex flex-col gap-3">
          <!-- Populated by cart.js -->
        </div>
      </div>

      <aside class="lg:sticky lg:top-[154px]">
        <div class="bg-white border border-hairline rounded-2xl p-6">
          <h3 class="text-[11px] font-bold uppercase tracking-[2px] text-muted mb-4 pb-3 border-b border-hairline">Resumen</h3>

          <div class="flex flex-col gap-2.5 mb-4">
            <div class="flex justify-between text-[13.5px] text-navy/75">
              <span>Subtotal (lista)</span>
              <span id="cart-subtotal-list" class="tabular-nums">$0</span>
            </div>
            <div id="cart-discount-row" class="flex justify-between text-[13.5px] text-teal-deep font-semibold" style="display:none;">
              <span>Descuento Ef./Transf.</span>
              <span id="cart-discount-amount" class="tabular-nums">$0</span>
            </div>
          </div>

          <div class="flex justify-between items-baseline pt-4 border-t border-hairline">
            <span class="text-[13px] font-semibold text-navy">Total</span>
            <span id="cart-total" class="font-display text-[24px] font-bold text-navy tabular-nums">$0</span>
          </div>
          <div id="cart-savings" class="text-[11.5px] text-teal-deep font-semibold text-right mt-1" style="display:none;"></div>

          <a href="/checkout"
             class="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-[14px] font-semibold rounded-full bg-primary text-white transition-all hover:bg-navy hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(64,15,255,0.28)]">
            Continuar
            <iconify-icon icon="lucide:arrow-right" width="15" height="15"></iconify-icon>
          </a>
          <a href="/productos"
             class="mt-2 w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-[13px] font-semibold rounded-full border border-hairline text-navy bg-white transition-all hover:border-primary hover:text-primary">
            Seguir comprando
          </a>

          <p class="text-[11.5px] text-muted text-center mt-4 leading-snug">
            Siguiente paso: tus datos y confirmación por WhatsApp.
          </p>
        </div>
      </aside>
    </div>

  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
<script>renderCartPage();</script>
