<?php
$page_title = 'Carrito — ' . SITE_NAME;
require __DIR__ . '/../includes/header.php';
?>

<section class="py-10 md:py-14">
  <div class="w-full max-w-[1200px] mx-auto px-5">
    <h1 class="font-display text-[1.4rem] md:text-[1.75rem] font-semibold mb-7 text-navy leading-[1.3]">Tu carrito</h1>

    <div id="cart-empty" class="text-center px-4 py-[72px]" style="display:none;">
      <div class="flex items-center justify-center w-[100px] h-[100px] mx-auto mb-6 rounded-full bg-primary-light text-primary">
        <iconify-icon icon="lucide:shopping-bag" width="44" height="44"></iconify-icon>
      </div>
      <h2 class="font-display text-[1.5rem] mb-2">Tu carrito está vacío</h2>
      <p class="text-muted mb-7">Agrega productos para comenzar tu pedido.</p>
      <a href="/productos"
         class="inline-flex items-center justify-center gap-2 px-7 py-[13px] text-[14px] font-semibold tracking-[0.3px] rounded-full border-2 border-primary bg-primary text-white transition-all hover:bg-navy hover:border-navy hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(64,15,255,0.28)]">
        <iconify-icon icon="lucide:package" width="16" height="16"></iconify-icon>
        Ver productos
      </a>
    </div>

    <div id="cart-filled" style="display:none;">
      <table class="cart-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Precio</th>
            <th>Cantidad</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="cart-items">
          <!-- Populated by cart.js -->
        </tbody>
      </table>

      <div class="bg-white border border-hairline rounded-[20px] p-7 mt-7 md:max-w-[420px] md:ml-auto">
        <div class="flex justify-between items-center">
          <span class="text-[14px] text-muted">Total</span>
          <span id="cart-total" class="font-display text-[1.75rem] font-bold text-navy">$0</span>
        </div>
        <a href="/checkout"
           class="w-full mt-4 inline-flex items-center justify-center gap-2 px-7 py-[13px] text-[14px] font-semibold tracking-[0.3px] rounded-full border-2 border-primary bg-primary text-white transition-all hover:bg-navy hover:border-navy hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(64,15,255,0.28)]">
          <iconify-icon icon="lucide:check" width="16" height="16"></iconify-icon>
          Finalizar compra
        </a>
        <a href="/productos"
           class="w-full mt-2 inline-flex items-center justify-center gap-2 px-7 py-[13px] text-[14px] font-semibold tracking-[0.3px] rounded-full border-2 border-primary bg-transparent text-primary transition-all hover:bg-primary hover:text-white hover:-translate-y-px">
          <iconify-icon icon="lucide:arrow-left" width="16" height="16"></iconify-icon>
          Seguir comprando
        </a>
      </div>
    </div>

  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
<script>renderCartPage();</script>
