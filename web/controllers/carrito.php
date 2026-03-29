<?php
$page_title = 'Carrito — ' . SITE_NAME;
require __DIR__ . '/../includes/header.php';
?>

<section class="section">
  <div class="container">
    <h1 class="section-title">Tu carrito</h1>

    <!-- Empty state (shown/hidden by JS) -->
    <div id="cart-empty" class="cart-empty" style="display:none;">
      <div class="cart-empty-icon">
        <iconify-icon icon="lucide:shopping-bag" width="44" height="44"></iconify-icon>
      </div>
      <h2>Tu carrito está vacío</h2>
      <p>Agrega productos para comenzar tu pedido.</p>
      <a href="/productos" class="btn btn-primary">
        <iconify-icon icon="lucide:package" width="16" height="16"></iconify-icon>
        Ver productos
      </a>
    </div>

    <!-- Filled cart (shown/hidden by JS) -->
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

      <div class="cart-summary">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="cart-total-label">Total</span>
          <span class="cart-total-amount" id="cart-total">$0</span>
        </div>
        <a href="/checkout" class="btn btn-primary">
          <iconify-icon icon="lucide:check" width="16" height="16"></iconify-icon>
          Finalizar compra
        </a>
        <a href="/productos" class="btn btn-outline" style="margin-top:8px;">
          <iconify-icon icon="lucide:arrow-left" width="16" height="16"></iconify-icon>
          Seguir comprando
        </a>
      </div>
    </div>

  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
<script>renderCartPage();</script>
