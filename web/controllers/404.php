<?php
$page_title = 'Página no encontrada — ' . SITE_NAME;
require __DIR__ . '/../includes/header.php';
?>

<section class="not-found">
  <div class="not-found-icon">
    <iconify-icon icon="mdi:paw" width="52" height="52"></iconify-icon>
  </div>
  <h1>404</h1>
  <h2>Página no encontrada</h2>
  <p>La página que buscás no existe o fue movida.</p>
  <a href="/" class="btn btn-primary">
    <iconify-icon icon="lucide:home" width="16" height="16"></iconify-icon>
    Volver al inicio
  </a>
</section>

<?php require __DIR__ . '/../includes/footer.php'; ?>
