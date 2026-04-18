<?php
$page_title = 'Finalizar compra — ' . SITE_NAME;
require __DIR__ . '/../includes/header-v4.php';

$inputClass = 'w-full py-3 px-4 border border-hairline rounded-xl text-[15px] transition-all outline-none bg-white focus:border-primary focus:shadow-[0_0_0_3px_rgba(64,15,255,0.1)]';
?>

<section class="py-8 md:py-10">
  <div class="w-full max-w-[1200px] mx-auto px-5">

    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-[12.5px] text-muted mb-6 flex-wrap">
      <a href="/" class="text-muted transition-colors hover:text-primary">Inicio</a>
      <iconify-icon icon="lucide:chevron-right" width="12" height="12" class="opacity-40"></iconify-icon>
      <a href="/carrito" class="text-muted transition-colors hover:text-primary">Carrito</a>
      <iconify-icon icon="lucide:chevron-right" width="12" height="12" class="opacity-40"></iconify-icon>
      <span class="text-navy">Confirmar</span>
    </nav>

    <!-- Title -->
    <div class="flex items-end justify-between flex-wrap gap-4 mb-8">
      <div>
        <h1 class="font-display text-[32px] md:text-[42px] font-semibold text-navy leading-[1.05]">Finalizar compra</h1>
        <p class="text-[13.5px] text-muted mt-2 max-w-[520px]">
          Completá tus datos y te contactamos por WhatsApp para confirmar el pedido y coordinar entrega o retiro.
        </p>
      </div>
      <a href="/carrito"
         class="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:text-navy transition-colors">
        <iconify-icon icon="lucide:arrow-left" width="14" height="14"></iconify-icon>
        Volver al carrito
      </a>
    </div>

    <div class="grid lg:grid-cols-[1.5fr_1fr] gap-8 items-start">

      <!-- ─── Form ──────────────────────────────────── -->
      <div class="bg-white border border-hairline rounded-2xl p-5 md:p-7">
        <h2 class="text-[11px] font-bold uppercase tracking-[2px] text-primary mb-5 pb-3 border-b border-hairline">Tus datos</h2>

        <form onsubmit="handleCheckout(event)" class="flex flex-col gap-5">
          <div>
            <label class="block text-[13px] font-semibold mb-1.5 text-navy">Nombre <span class="text-error">*</span></label>
            <input type="text" name="name" required placeholder="Tu nombre" class="<?= $inputClass ?>">
          </div>

          <div>
            <label class="block text-[13px] font-semibold mb-1.5 text-navy">Teléfono <span class="text-error">*</span></label>
            <input type="tel" name="phone" required placeholder="351..." class="<?= $inputClass ?>">
            <p class="text-[11.5px] text-muted mt-1.5">Te escribimos a este número por WhatsApp.</p>
          </div>

          <div>
            <label class="block text-[13px] font-semibold mb-1.5 text-navy">
              Notas del pedido <span class="text-muted font-normal">(opcional)</span>
            </label>
            <textarea name="notes" rows="3" placeholder="Indicaciones de entrega, horario preferido, consultas…"
                      class="<?= $inputClass ?> resize-y min-h-[88px]"></textarea>
          </div>

          <div class="flex gap-3 items-start p-3.5 rounded-xl bg-teal-wash border border-teal/20">
            <iconify-icon icon="lucide:info" width="18" height="18" class="text-teal-deep shrink-0 mt-0.5"></iconify-icon>
            <div class="flex-1 text-[12.5px] text-navy leading-[1.55]">
              <strong class="font-semibold">No pagás online.</strong>
              El pago se coordina por WhatsApp al confirmar el pedido: efectivo, transferencia o en el local.
            </div>
          </div>

          <button type="submit"
                  class="w-full inline-flex items-center justify-center gap-2 px-7 py-[14px] text-[14px] font-bold tracking-[0.3px] rounded-full bg-success text-white transition-all hover:bg-[#1EBE57] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(37,211,102,0.32)]">
            <iconify-icon icon="mdi:whatsapp" width="18" height="18"></iconify-icon>
            Enviar pedido por WhatsApp
          </button>
        </form>
      </div>

      <!-- ─── Summary (purple gradient) ──────────────── -->
      <aside class="lg:sticky lg:top-[154px]">
        <div class="bg-white border border-hairline rounded-[20px] overflow-hidden">

          <div class="relative overflow-hidden px-6 py-5 text-white">
            <div class="absolute inset-0"
                 style="background: radial-gradient(at 30% 20%, rgb(47, 44, 110) 0%, rgb(32, 28, 78) 42%, rgb(19, 16, 58) 100%);"></div>
            <div class="absolute rounded-full blur-[60px] opacity-40 pointer-events-none"
                 style="width:400px;height:400px;top:-120px;right:-60px;background:rgb(64,15,255);"></div>
            <div class="absolute rounded-full blur-[70px] opacity-30 pointer-events-none"
                 style="width:320px;height:320px;bottom:-100px;left:10%;background:rgb(0,206,206);"></div>
            <div class="relative">
              <div class="text-[10.5px] font-bold tracking-[2.5px] uppercase text-teal">Resumen del pedido</div>
              <div class="font-display text-[26px] font-semibold mt-1">Tu universo</div>
            </div>
          </div>

          <div class="p-6 flex flex-col gap-4">
            <ul id="checkout-items" class="flex flex-col gap-2.5 max-h-[240px] overflow-y-auto pr-1">
              <!-- Populated by cart.js -->
            </ul>

            <div class="border-t border-hairline"></div>

            <div class="flex flex-col gap-2">
              <div class="flex justify-between text-[13.5px] text-navy/80">
                <span>Subtotal (lista)</span>
                <span id="checkout-subtotal-list" class="tabular-nums">$0</span>
              </div>
              <div id="checkout-discount-row" class="flex justify-between text-[13.5px] text-teal-deep font-semibold" style="display:none;">
                <span>Descuento Ef./Transf.</span>
                <span id="checkout-discount-amount" class="tabular-nums">$0</span>
              </div>
              <div class="flex justify-between text-[13.5px] text-navy/80">
                <span>Envío</span>
                <span class="tabular-nums">A coordinar</span>
              </div>
            </div>

            <div class="border-t border-hairline"></div>

            <div class="flex justify-between items-baseline">
              <span class="text-[13px] font-semibold text-muted uppercase tracking-[1px]">Total</span>
              <span id="checkout-total" class="font-display text-[32px] font-bold text-navy tabular-nums">$0</span>
            </div>
            <div id="checkout-savings" class="-mt-2 text-[11.5px] text-teal-deep font-semibold text-right" style="display:none;"></div>

            <div class="mt-1 grid grid-cols-3 gap-2 text-center text-[10.5px] text-muted">
              <div class="py-2 rounded-lg bg-canvas border border-hairline">
                <iconify-icon icon="lucide:truck" width="18" class="text-primary"></iconify-icon>
                <div class="mt-1 font-semibold text-navy">Envíos</div>
              </div>
              <div class="py-2 rounded-lg bg-canvas border border-hairline">
                <iconify-icon icon="mdi:whatsapp" width="18" class="text-success"></iconify-icon>
                <div class="mt-1 font-semibold text-navy">Asesoramiento</div>
              </div>
              <div class="py-2 rounded-lg bg-canvas border border-hairline">
                <iconify-icon icon="lucide:shield-check" width="18" class="text-primary"></iconify-icon>
                <div class="mt-1 font-semibold text-navy">Seguro</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

  </div>
</section>

<?php require __DIR__ . '/../includes/footer-v4.php'; ?>
<script>renderCheckoutSummary();</script>
