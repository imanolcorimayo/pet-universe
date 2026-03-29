<?php
$page_title = 'Checkout — ' . SITE_NAME;
require __DIR__ . '/../includes/header.php';
?>

<section class="section">
  <div class="container">
    <h1 class="section-title">Finalizar compra</h1>

    <div class="checkout-layout">
      <!-- Form -->
      <form onsubmit="handleCheckout(event)">
        <div class="form-group">
          <label class="form-label">Nombre <span class="form-required">*</span></label>
          <input type="text" name="name" class="form-input" required placeholder="Tu nombre">
        </div>

        <div class="form-group">
          <label class="form-label">Teléfono <span class="form-required">*</span></label>
          <input type="tel" name="phone" class="form-input" required placeholder="351...">
        </div>

        <div class="form-group">
          <label class="form-label">Notas (opcional)</label>
          <textarea name="notes" class="form-textarea" placeholder="Indicaciones de entrega, consultas, etc."></textarea>
        </div>

        <button type="submit" class="btn btn-whatsapp" style="width:100%;">
          <iconify-icon icon="mdi:whatsapp" width="18" height="18"></iconify-icon>
          Enviar pedido por WhatsApp
        </button>
      </form>

      <!-- Order Summary -->
      <div class="checkout-summary">
        <h3>Resumen del pedido</h3>
        <ul class="checkout-summary-items" id="checkout-items">
          <!-- Populated by cart.js -->
        </ul>
        <div class="checkout-summary-total">
          <span>Total</span>
          <span id="checkout-total">$0</span>
        </div>
      </div>
    </div>

  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
<script>renderCheckoutSummary();</script>
