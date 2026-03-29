/**
 * Pet Universe — localStorage Cart
 */
const CART_KEY = 'petu_cart';

const cart = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch { return []; }
  },

  save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadge();
  },

  addItem(product, qty = 1) {
    const items = this.get();
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      items.push({
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand || '',
        price: product.priceRegular || product.price || 0,
        priceCash: product.priceCash || 0,
        quantity: qty,
      });
    }
    this.save(items);
  },

  removeItem(id) {
    const items = this.get().filter(i => i.id !== id);
    this.save(items);
  },

  updateQty(id, qty) {
    const items = this.get();
    const item = items.find(i => i.id === id);
    if (item) {
      item.quantity = Math.max(1, qty);
      this.save(items);
    }
  },

  clear() {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
  },

  getTotal() {
    return this.get().reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  getItemCount() {
    return this.get().reduce((sum, i) => sum + i.quantity, 0);
  }
};

function formatPrice(amount) {
  return '$' + Math.round(amount).toLocaleString('es-AR');
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = cart.getItemCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

// Safe text escaping
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// Safe DOM element creation helper
function el(tag, attrs = {}, children = []) {
  const elem = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'textContent') elem.textContent = val;
    else if (key === 'className') elem.className = val;
    else if (key.startsWith('on')) elem.addEventListener(key.slice(2).toLowerCase(), val);
    else elem.setAttribute(key, val);
  }
  children.forEach(child => {
    if (typeof child === 'string') elem.appendChild(document.createTextNode(child));
    else if (child) elem.appendChild(child);
  });
  return elem;
}

/**
 * Render cart page using safe DOM manipulation (called from carrito.php)
 */
function renderCartPage() {
  const container = document.getElementById('cart-items');
  const emptyState = document.getElementById('cart-empty');
  const filledState = document.getElementById('cart-filled');
  const totalEl = document.getElementById('cart-total');

  if (!container) return;

  const items = cart.get();

  if (items.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (filledState) filledState.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (filledState) filledState.style.display = 'block';

  // Clear existing rows
  container.replaceChildren();

  items.forEach(item => {
    const row = el('tr', {}, [
      // Name + brand
      el('td', {}, [
        el('div', { className: 'cart-item-name', textContent: item.name }),
        item.brand ? el('div', { className: 'cart-item-brand', textContent: item.brand }) : null,
      ]),
      // Price
      el('td', { className: 'cart-item-price', textContent: formatPrice(item.price) }),
      // Quantity
      el('td', {}, [
        el('div', { className: 'qty-selector' }, [
          el('button', { className: 'qty-btn', textContent: '-', onClick: () => { changeQty(item.id, -1); } }),
          (() => {
            const inp = el('input', { type: 'number', className: 'qty-input', value: item.quantity, min: '1' });
            inp.addEventListener('change', () => setQty(item.id, inp.value));
            return inp;
          })(),
          el('button', { className: 'qty-btn', textContent: '+', onClick: () => { changeQty(item.id, 1); } }),
        ]),
      ]),
      // Subtotal
      el('td', { className: 'cart-item-subtotal', textContent: formatPrice(item.price * item.quantity) }),
      // Remove
      el('td', {}, [
        el('button', { className: 'cart-item-remove', textContent: 'Eliminar', onClick: () => { removeFromCart(item.id); } }),
      ]),
    ]);
    container.appendChild(row);
  });

  if (totalEl) totalEl.textContent = formatPrice(cart.getTotal());
}

function changeQty(id, delta) {
  const items = cart.get();
  const item = items.find(i => i.id === id);
  if (item) {
    cart.updateQty(id, item.quantity + delta);
    renderCartPage();
  }
}

function setQty(id, val) {
  cart.updateQty(id, parseInt(val) || 1);
  renderCartPage();
}

function removeFromCart(id) {
  cart.removeItem(id);
  renderCartPage();
}

/**
 * Render checkout order summary using safe DOM manipulation (called from checkout.php)
 */
function renderCheckoutSummary() {
  const list = document.getElementById('checkout-items');
  const totalEl = document.getElementById('checkout-total');
  if (!list) return;

  const items = cart.get();
  if (items.length === 0) {
    window.location.href = '/carrito';
    return;
  }

  list.replaceChildren();
  items.forEach(item => {
    list.appendChild(
      el('li', { className: 'checkout-summary-item' }, [
        el('span', { textContent: `${item.quantity}x ${item.name}` }),
        el('span', { textContent: formatPrice(item.price * item.quantity) }),
      ])
    );
  });

  if (totalEl) totalEl.textContent = formatPrice(cart.getTotal());
}

/**
 * Build WhatsApp message and redirect.
 */
function handleCheckout(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.querySelector('[name="name"]')?.value?.trim();
  const phone = form.querySelector('[name="phone"]')?.value?.trim();
  const notes = form.querySelector('[name="notes"]')?.value?.trim();

  if (!name || !phone) {
    alert('Por favor completa tu nombre y telefono.');
    return;
  }

  const items = cart.get();
  if (items.length === 0) return;

  let msg = `Hola! Quiero hacer un pedido:\n\n`;
  msg += items.map(i => `- ${i.quantity}x ${i.name} — ${formatPrice(i.price * i.quantity)}`).join('\n');
  msg += `\n\n*Total: ${formatPrice(cart.getTotal())}*`;
  msg += `\n\nNombre: ${name}`;
  msg += `\nTelefono: ${phone}`;
  if (notes) msg += `\nNotas: ${notes}`;

  const waUrl = `https://wa.me/5493517605708?text=${encodeURIComponent(msg)}`;
  cart.clear();
  window.open(waUrl, '_blank');
  window.location.href = '/';
}

/**
 * Add to cart from product card or detail page.
 */
function addToCart(productJson) {
  const product = typeof productJson === 'string' ? JSON.parse(productJson) : productJson;
  const qtyInput = document.getElementById('product-qty');
  const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
  cart.addItem(product, qty);

  // Brief visual feedback
  const badge = document.getElementById('cart-badge');
  if (badge) {
    badge.style.transform = 'scale(1.3)';
    setTimeout(() => { badge.style.transform = ''; }, 200);
  }
}

// Init badge on load
document.addEventListener('DOMContentLoaded', updateCartBadge);
