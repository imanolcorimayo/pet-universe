/**
 * Pet Universe — localStorage Cart
 */
const CART_KEY = 'petu_cart';
const CART_CDN = 'https://wiseutils-cdn.nyc3.cdn.digitaloceanspaces.com/pet-universe/products';

// Returns the actual price the customer pays: oferta → cash → regular → legacy .price.
function leadPrice(item) {
  if (item.priceOferta && item.priceCash && item.priceOferta < item.priceCash) return item.priceOferta;
  if (item.priceCash) return item.priceCash;
  if (item.priceRegular) return item.priceRegular;
  return item.price || 0;
}

// Struck-through reference price when on oferta, else 0.
function strikePrice(item) {
  if (item.priceOferta && item.priceCash && item.priceOferta < item.priceCash) return item.priceCash;
  return 0;
}

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
    const notes = (product.notes || '').trim();
    const existing = items.find(i => i.id === product.id && (i.notes || '') === notes);
    if (existing) {
      existing.quantity += qty;
    } else {
      items.push({
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand || '',
        priceRegular: product.priceRegular || 0,
        priceCash: product.priceCash || 0,
        priceOferta: product.priceOferta || 0,
        hasImage: product.hasImage !== undefined ? product.hasImage : true,
        imageUpdatedAt: product.imageUpdatedAt || 0,
        quantity: qty,
        notes: notes,
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

  updateNotes(id, notes) {
    const items = this.get();
    const item = items.find(i => i.id === id);
    if (item) {
      item.notes = (notes || '').trim();
      this.save(items);
    }
  },

  clear() {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
  },

  getTotal() {
    return this.get().reduce((sum, i) => sum + leadPrice(i) * i.quantity, 0);
  },

  getItemCount() {
    return this.get().reduce((sum, i) => sum + i.quantity, 0);
  }
};

function formatPrice(amount) {
  return '$' + Math.round(amount).toLocaleString('es-AR');
}

function updateCartBadge() {
  const badges = document.querySelectorAll('[id^="cart-badge"]');
  if (!badges.length) return;
  const count = cart.getItemCount();
  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
}

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
 * Render the notes block for a cart row. Shows a read-only line with an
 * "Editar" affordance when a note exists, or a small "+ Agregar nota" link
 * when it doesn't. Clicking either swaps in a textarea with Save/Cancel —
 * no permanent editable form field in the row.
 */
function renderNoteCell(item) {
  const wrap = el('div', { className: 'cart-item-notes-wrap mt-1.5' });

  function renderView() {
    wrap.replaceChildren();
    if (item.notes) {
      const row = el('div', { className: 'flex items-start gap-2 text-[12px] leading-[1.45]' }, [
        el('iconify-icon', { icon: 'lucide:sticky-note', width: '12', height: '12', class: 'text-muted shrink-0 mt-0.5' }),
        el('span', { className: 'text-navy/75 italic flex-1', textContent: item.notes }),
        el('button', {
          type: 'button',
          className: 'shrink-0 text-[11.5px] font-semibold text-primary hover:text-navy transition-colors',
          textContent: 'Editar',
          onClick: renderEditor,
        }),
      ]);
      wrap.appendChild(row);
    } else {
      wrap.appendChild(el('button', {
        type: 'button',
        className: 'inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted hover:text-primary transition-colors',
        onClick: renderEditor,
      }, [
        el('iconify-icon', { icon: 'lucide:plus', width: '11', height: '11' }),
        document.createTextNode('Agregar nota'),
      ]));
    }
  }

  function renderEditor() {
    wrap.replaceChildren();
    const textarea = el('textarea', {
      className: 'w-full py-1.5 px-2.5 border border-hairline rounded-lg text-[12px] leading-[1.45] outline-none bg-white resize-y min-h-[52px] focus:border-primary focus:shadow-[0_0_0_3px_rgba(64,15,255,0.1)]',
      placeholder: 'Ej.: quiero 3 kg sueltos en vez de la bolsa cerrada',
      rows: '2',
    });
    textarea.value = item.notes || '';

    const save = el('button', {
      type: 'button',
      className: 'text-[11.5px] font-semibold text-primary hover:text-navy transition-colors',
      textContent: 'Guardar',
      onClick: () => {
        item.notes = (textarea.value || '').trim();
        cart.updateNotes(item.id, item.notes);
        renderView();
      },
    });
    const cancel = el('button', {
      type: 'button',
      className: 'text-[11.5px] font-semibold text-muted hover:text-navy transition-colors',
      textContent: 'Cancelar',
      onClick: renderView,
    });

    wrap.appendChild(textarea);
    wrap.appendChild(el('div', { className: 'flex items-center gap-3 mt-1.5' }, [save, cancel]));
    textarea.focus();
  }

  renderView();
  return wrap;
}

/**
 * Render cart page using safe DOM manipulation (called from carrito.php).
 * Layout: one white rounded card per item (image + info + qty / subtotal / quitar).
 * Populates the purple-gradient summary panel with subtotal / descuento / total.
 */
function renderCartPage() {
  const container   = document.getElementById('cart-items');
  const emptyState  = document.getElementById('cart-empty');
  const filledState = document.getElementById('cart-filled');
  if (!container) return;

  const items = cart.get();

  if (items.length === 0) {
    if (emptyState)  emptyState.style.display  = 'block';
    if (filledState) filledState.style.display = 'none';
    const sub = document.getElementById('cart-subtitle');
    if (sub) sub.textContent = 'Tu carrito está vacío';
    const topContinue = document.getElementById('cart-continue-top');
    if (topContinue) topContinue.style.display = 'none';
    return;
  }

  if (emptyState)  emptyState.style.display  = 'none';
  if (filledState) filledState.style.display = 'grid';
  const topContinue = document.getElementById('cart-continue-top');
  if (topContinue) topContinue.style.display = 'inline-flex';

  container.replaceChildren();

  items.forEach(item => container.appendChild(renderCartRow(item)));

  renderCartSummary(items);
}

function renderCartRow(item) {
  const lead   = leadPrice(item);
  const strike = strikePrice(item);
  const href   = item.slug ? '/producto/' + item.slug : '#';

  // Image thumbnail: try CDN, fallback to package icon on error.
  const thumb = el('a', {
    href: href,
    className: 'shrink-0 w-[84px] h-[84px] md:w-[100px] md:h-[100px] rounded-xl overflow-hidden bg-canvas grid place-items-center',
  });
  if (item.slug && item.hasImage !== false) {
    const img = el('img', {
      src: CART_CDN + '/' + item.slug + '-sm.webp' + (item.imageUpdatedAt ? '?v=' + item.imageUpdatedAt : ''),
      alt: item.name,
      className: 'w-full h-full object-cover',
      loading: 'lazy',
    });
    img.addEventListener('error', () => {
      img.style.display = 'none';
      thumb.appendChild(el('iconify-icon', {
        icon: 'lucide:package', width: '28', height: '28', class: 'text-primary opacity-30',
      }));
    });
    thumb.appendChild(img);
  } else {
    thumb.appendChild(el('iconify-icon', {
      icon: 'lucide:package', width: '28', height: '28', class: 'text-primary opacity-30',
    }));
  }

  // Center column: name, brand, price row, notes.
  const priceRow = el('div', { className: 'flex items-center gap-2 mt-2 flex-wrap' }, [
    el('span', {
      className: 'inline-block px-2 py-[1px] text-[9.5px] font-bold tracking-[0.4px] uppercase text-teal-deep bg-teal-wash rounded-full',
      textContent: 'Ef./Transf.',
    }),
    el('span', { className: 'text-[14px] font-bold text-navy tabular-nums', textContent: formatPrice(lead) }),
    strike
      ? el('span', { className: 'text-[11.5px] text-muted line-through tabular-nums', textContent: formatPrice(strike) })
      : null,
    strike
      ? el('span', {
          className: 'bg-teal text-navy text-[9px] font-extrabold tracking-[0.8px] uppercase px-1.5 py-[2px] rounded',
          textContent: '¡Oferta!',
        })
      : null,
  ]);

  const center = el('div', { className: 'flex-1 min-w-0' }, [
    el('a', {
      href: href,
      className: 'block text-left font-semibold text-navy text-[15px] leading-tight hover:text-primary transition-colors line-clamp-2',
      textContent: item.name,
    }),
    item.brand ? el('div', { className: 'text-[12px] text-muted mt-0.5', textContent: item.brand }) : null,
    priceRow,
    renderNoteCell(item),
  ]);

  // Right column: qty pill, subtotal, quitar.
  const qtyPill = el('div', { className: 'inline-flex items-stretch border border-hairline rounded-full overflow-hidden bg-white' }, [
    el('button', {
      type: 'button',
      className: 'w-8 h-8 grid place-items-center text-navy hover:bg-primary-light transition-colors',
      onClick: () => changeQty(item.id, -1),
    }, [el('iconify-icon', { icon: 'lucide:minus', width: '13', height: '13' })]),
    el('span', { className: 'w-12 text-center text-[13px] font-bold text-navy tabular-nums self-center', textContent: item.quantity }),
    el('button', {
      type: 'button',
      className: 'w-8 h-8 grid place-items-center text-navy hover:bg-primary-light transition-colors',
      onClick: () => changeQty(item.id, 1),
    }, [el('iconify-icon', { icon: 'lucide:plus', width: '13', height: '13' })]),
  ]);

  const right = el('div', { className: 'flex flex-col items-end gap-2 shrink-0' }, [
    qtyPill,
    el('div', { className: 'text-[15px] font-bold text-navy tabular-nums', textContent: formatPrice(lead * item.quantity) }),
    el('button', {
      type: 'button',
      className: 'text-[11.5px] text-muted hover:text-error transition-colors inline-flex items-center gap-1',
      onClick: () => removeFromCart(item.id),
    }, [
      el('iconify-icon', { icon: 'lucide:trash-2', width: '12', height: '12' }),
      document.createTextNode('Quitar'),
    ]),
  ]);

  return el('div', {
    className: 'bg-white border border-hairline rounded-2xl p-4 md:p-5 flex gap-4 items-center',
  }, [thumb, center, right]);
}

function renderCartSummary(items) {
  let subtotalList = 0;
  let totalLead    = 0;
  items.forEach(i => {
    const list = i.priceRegular || leadPrice(i);
    subtotalList += list * i.quantity;
    totalLead    += leadPrice(i) * i.quantity;
  });
  const discount = Math.max(0, subtotalList - totalLead);

  const subEl      = document.getElementById('cart-subtotal-list');
  const discRow    = document.getElementById('cart-discount-row');
  const discAmt    = document.getElementById('cart-discount-amount');
  const totalEl    = document.getElementById('cart-total');
  const savingsEl  = document.getElementById('cart-savings');
  const subtitleEl = document.getElementById('cart-subtitle');

  if (subEl)   subEl.textContent   = formatPrice(subtotalList);
  if (totalEl) totalEl.textContent = formatPrice(totalLead);

  if (discRow && discAmt) {
    if (discount > 0) {
      discRow.style.display = 'flex';
      discAmt.textContent   = '−' + formatPrice(discount);
    } else {
      discRow.style.display = 'none';
    }
  }
  if (savingsEl) {
    if (discount > 0) {
      savingsEl.style.display = 'block';
      savingsEl.textContent   = '¡Estás ahorrando ' + formatPrice(discount) + '!';
    } else {
      savingsEl.style.display = 'none';
    }
  }
  if (subtitleEl) {
    const n = items.reduce((s, i) => s + i.quantity, 0);
    subtitleEl.textContent = n + ' producto' + (n !== 1 ? 's' : '') + ' · Precios efectivo/transferencia';
  }
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
 * Render checkout order summary (called from checkout.php).
 * Populates the item list + purple-gradient summary breakdown.
 */
function renderCheckoutSummary() {
  const list = document.getElementById('checkout-items');
  if (!list) return;

  const items = cart.get();
  if (items.length === 0) {
    window.location.href = '/carrito';
    return;
  }

  // ── Compact item list ──
  list.replaceChildren();
  items.forEach(item => {
    const lead = leadPrice(item);
    const line = el('li', {
      className: 'flex flex-col gap-0.5 text-[13px]',
    }, [
      el('div', { className: 'flex justify-between gap-3 items-baseline' }, [
        el('span', { className: 'text-navy flex-1', textContent: item.quantity + 'x ' + item.name }),
        el('span', { className: 'text-navy font-semibold tabular-nums shrink-0', textContent: formatPrice(lead * item.quantity) }),
      ]),
      item.notes
        ? el('span', { className: 'text-[11.5px] text-muted italic leading-snug', textContent: 'Nota: ' + item.notes })
        : null,
    ]);
    list.appendChild(line);
  });

  // ── Summary totals ──
  let subtotalList = 0;
  let totalLead    = 0;
  items.forEach(i => {
    const listPrice = i.priceRegular || leadPrice(i);
    subtotalList += listPrice * i.quantity;
    totalLead    += leadPrice(i) * i.quantity;
  });
  const discount = Math.max(0, subtotalList - totalLead);

  const subEl     = document.getElementById('checkout-subtotal-list');
  const discRow   = document.getElementById('checkout-discount-row');
  const discAmt   = document.getElementById('checkout-discount-amount');
  const totalEl   = document.getElementById('checkout-total');
  const savingsEl = document.getElementById('checkout-savings');

  if (subEl)   subEl.textContent   = formatPrice(subtotalList);
  if (totalEl) totalEl.textContent = formatPrice(totalLead);

  if (discRow && discAmt) {
    if (discount > 0) {
      discRow.style.display = 'flex';
      discAmt.textContent   = '−' + formatPrice(discount);
    } else {
      discRow.style.display = 'none';
    }
  }
  if (savingsEl) {
    if (discount > 0) {
      savingsEl.style.display = 'block';
      savingsEl.textContent   = '¡Estás ahorrando ' + formatPrice(discount) + '!';
    } else {
      savingsEl.style.display = 'none';
    }
  }
}

/**
 * Build WhatsApp message, open it in a new tab, and show the confirmation
 * modal. Cart is preserved until the user explicitly confirms they sent
 * the message — protects against popup blockers and accidental loss.
 */
function handleCheckout(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.querySelector('[name="name"]')?.value?.trim();
  const phone = form.querySelector('[name="phone"]')?.value?.trim();
  const notes = form.querySelector('[name="notes"]')?.value?.trim();

  if (!name || !phone) {
    alert('Por favor completá tu nombre y teléfono.');
    return;
  }

  const items = cart.get();
  if (items.length === 0) return;

  let msg = `Hola! Quiero hacer un pedido:\n\n`;
  msg += items.map(i => {
    const lead = leadPrice(i);
    let line = `- ${i.quantity}x ${i.name} — ${formatPrice(lead * i.quantity)}`;
    if (i.notes) line += `\n  · Nota: ${i.notes}`;
    return line;
  }).join('\n');
  msg += `\n\n*Total: ${formatPrice(cart.getTotal())}*`;
  msg += `\n\nNombre: ${name}`;
  msg += `\nTelefono: ${phone}`;
  if (notes) msg += `\nNotas: ${notes}`;

  const waNumber = (window.PETU_CONFIG && window.PETU_CONFIG.whatsappNumber) || '';
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;

  window.open(waUrl, '_blank');
  showCheckoutConfirmModal(waUrl);
}

function showCheckoutConfirmModal(waUrl) {
  const modal = document.getElementById('checkout-confirm-modal');
  if (!modal) {
    // No modal in DOM — degrade to old behavior so the flow still completes.
    cart.clear();
    window.location.href = '/gracias';
    return;
  }

  modal.querySelector('[data-reopen]').onclick = (e) => {
    e.preventDefault();
    window.open(waUrl, '_blank');
  };
  modal.querySelector('[data-sent]').onclick = () => {
    cart.clear();
    window.location.href = '/gracias';
  };
  modal.querySelector('[data-cancel]').onclick = () => {
    modal.style.display = 'none';
  };

  modal.style.display = 'flex';
}

/**
 * Add to cart from a product card (grid / listing).
 */
function addToCart(productJson) {
  const product = typeof productJson === 'string' ? JSON.parse(productJson) : productJson;
  const qtyInput = document.getElementById('product-qty');
  const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
  cart.addItem(product, qty);

  document.querySelectorAll('[id^="cart-badge"]').forEach(badge => {
    badge.style.transform = 'scale(1.3)';
    setTimeout(() => { badge.style.transform = ''; }, 200);
  });
}

document.addEventListener('DOMContentLoaded', updateCartBadge);
