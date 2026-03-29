<?php
$page_title = 'Estamos con problemas — ' . SITE_NAME;
require __DIR__ . '/../includes/header.php';
?>

<section class="section">
  <div class="container">
    <div class="error-state">
      <div class="error-state-icon">
        <iconify-icon icon="lucide:alert-triangle" width="44" height="44"></iconify-icon>
      </div>
      <h1>Nuestro buscador está temporalmente fuera de servicio</h1>
      <p>
        Estamos trabajando para solucionarlo. Mientras tanto, podés consultarnos el catálogo completo por WhatsApp.
      </p>
      <a href="https://wa.me/<?= WHATSAPP_NUMBER ?>?text=<?= urlencode('Hola! Quiero consultar el catálogo de productos.') ?>"
         class="btn btn-whatsapp btn-lg">
        <iconify-icon icon="mdi:whatsapp" width="20" height="20"></iconify-icon>
        Consultar catálogo por WhatsApp
      </a>
    </div>
  </div>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
