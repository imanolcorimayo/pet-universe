<?php
$page_title = 'Checkout — ' . SITE_NAME;
require __DIR__ . '/../includes/header.php';

$inputClass = 'w-full py-3 px-4 border border-hairline rounded-xl text-[15px] transition-all outline-none bg-white focus:border-primary focus:shadow-[0_0_0_3px_rgba(64,15,255,0.1)]';
?>

<section class="py-10 md:py-14">
  <div class="w-full max-w-[1200px] mx-auto px-5">
    <h1 class="font-display text-[1.4rem] md:text-[1.75rem] font-semibold mb-7 text-navy leading-[1.3]">Finalizar compra</h1>

    <div class="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-12 items-start">

      <form onsubmit="handleCheckout(event)">
        <div class="mb-[22px]">
          <label class="block text-[13px] font-semibold mb-1.5 text-navy">Nombre <span class="text-error">*</span></label>
          <input type="text" name="name" required placeholder="Tu nombre" class="<?= $inputClass ?>">
        </div>

        <div class="mb-[22px]">
          <label class="block text-[13px] font-semibold mb-1.5 text-navy">Teléfono <span class="text-error">*</span></label>
          <input type="tel" name="phone" required placeholder="351..." class="<?= $inputClass ?>">
        </div>

        <div class="mb-[22px]">
          <label class="block text-[13px] font-semibold mb-1.5 text-navy">Notas (opcional)</label>
          <textarea name="notes" placeholder="Indicaciones de entrega, consultas, etc."
                    class="<?= $inputClass ?> resize-y min-h-[80px]"></textarea>
        </div>

        <button type="submit"
                class="w-full inline-flex items-center justify-center gap-2 px-7 py-[13px] text-[14px] font-semibold tracking-[0.3px] rounded-full border-2 border-success bg-success text-white transition-all hover:bg-[#1EBE57] hover:border-[#1EBE57] hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(37,211,102,0.3)]">
          <iconify-icon icon="mdi:whatsapp" width="18" height="18"></iconify-icon>
          Enviar pedido por WhatsApp
        </button>
      </form>

      <div class="bg-white border border-hairline rounded-[20px] p-7 md:sticky md:top-[84px]">
        <h3 class="font-display text-[18px] mb-[18px]">Resumen del pedido</h3>
        <ul class="list-none" id="checkout-items">
          <!-- Populated by cart.js -->
        </ul>
        <div class="flex justify-between pt-[18px] text-[18px] font-bold text-navy">
          <span>Total</span>
          <span id="checkout-total">$0</span>
        </div>
      </div>
    </div>

  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
<script>renderCheckoutSummary();</script>
