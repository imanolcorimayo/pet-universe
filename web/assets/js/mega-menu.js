/**
 * Pet Universe — Category Mega-Menu
 * Desktop-only. Hover any pill or "Categorías" → opens shared panel,
 * fetches that category's top 9 products, caches by slug.
 */
(function () {
  const panel     = document.getElementById('mega-panel');
  const overlay   = document.getElementById('mega-overlay');
  const nav       = document.getElementById('mega-nav');
  const products  = document.getElementById('mega-products');
  const title     = document.getElementById('mega-panel-title');
  const viewAll   = document.getElementById('mega-panel-view-all');
  if (!panel || !overlay || !nav || !products || !title || !viewAll) return;

  const triggers    = Array.from(document.querySelectorAll('[data-mega-trigger]'));
  const sidebarItems = Array.from(document.querySelectorAll('[data-mega-sidebar]'));
  const defaultSlug = panel.getAttribute('data-default-slug') || '';

  const cache = new Map();
  let isOpen = false;
  let closeTimer = null;
  let currentSlug = null;

  const CDN_BASE = 'https://wiseutils-cdn.nyc3.cdn.digitaloceanspaces.com/pet-universe/products';

  function openPanel() {
    if (isOpen) return;
    isOpen = true;
    // Anchor panel directly under the nav bar's current position
    const navRect = nav.getBoundingClientRect();
    panel.style.top = Math.max(0, navRect.bottom) + 'px';
    overlay.classList.add('mega-visible');
    panel.classList.add('mega-visible');
  }

  function closePanel() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('mega-visible');
    panel.classList.remove('mega-visible');
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closePanel, 220);
  }

  function cancelClose() {
    clearTimeout(closeTimer);
  }

  function highlightSidebar(slug) {
    sidebarItems.forEach(el => {
      if (el.getAttribute('data-slug') === slug) {
        el.classList.add('is-active');
      } else {
        el.classList.remove('is-active');
      }
    });
  }

  function renderSkeleton() {
    products.replaceChildren();
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'flex flex-col items-center gap-2';
      const circle = document.createElement('div');
      circle.className = 'w-[92px] h-[92px] rounded-full bg-canvas animate-pulse';
      const name = document.createElement('div');
      name.className = 'w-20 h-3 rounded bg-canvas animate-pulse';
      cell.appendChild(circle);
      cell.appendChild(name);
      products.appendChild(cell);
    }
  }

  function renderEmpty() {
    products.replaceChildren();
    const msg = document.createElement('div');
    msg.className = 'col-span-3 text-center text-muted text-[14px] py-10';
    msg.textContent = 'No hay productos disponibles en esta categoría.';
    products.appendChild(msg);
  }

  function productImageUrl(slug, v) {
    return `${CDN_BASE}/${slug}-sm.webp?v=${v || 0}`;
  }

  function renderProducts(list) {
    products.replaceChildren();
    if (!list || list.length === 0) {
      renderEmpty();
      return;
    }
    list.slice(0, 9).forEach(p => {
      const a = document.createElement('a');
      a.href = `/producto/${p.slug}`;
      a.className = 'group flex flex-col items-center gap-2 text-center';

      // Circle wrapper (width-fit, relative so the Oferta tag can anchor to it, not the full cell)
      const circleWrap = document.createElement('div');
      circleWrap.className = 'relative w-[92px] h-[92px]';

      const imgWrap = document.createElement('div');
      imgWrap.className = 'w-full h-full rounded-full bg-canvas overflow-hidden border border-hairline transition-transform group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_20px_rgba(32,28,78,0.12)] flex items-center justify-center';

      if (p.hasImage) {
        const img = document.createElement('img');
        img.src = productImageUrl(p.slug, p.imageUpdatedAt);
        img.alt = p.name;
        img.loading = 'lazy';
        img.className = 'w-full h-full object-cover';
        img.onerror = () => { img.style.display = 'none'; };
        imgWrap.appendChild(img);
      } else {
        const icon = document.createElement('iconify-icon');
        icon.setAttribute('icon', 'lucide:package');
        icon.setAttribute('width', '32');
        icon.setAttribute('height', '32');
        icon.className = 'text-primary opacity-25';
        imgWrap.appendChild(icon);
      }

      circleWrap.appendChild(imgWrap);

      // Oferta tag — anchors to circleWrap (92px), sits on the circle's top-right edge
      if (p.hasCashDiscount) {
        const tag = document.createElement('span');
        tag.className = 'absolute -top-1 -right-2 z-[2] bg-error text-white text-[9px] font-extrabold tracking-[0.4px] uppercase px-1.5 py-0.5 rounded-full shadow pointer-events-none';
        tag.textContent = 'Oferta';
        circleWrap.appendChild(tag);
      }

      a.appendChild(circleWrap);

      const nameEl = document.createElement('span');
      nameEl.className = 'text-[11px] font-semibold text-navy leading-tight line-clamp-2 max-w-[100px] group-hover:text-primary transition-colors';
      nameEl.textContent = p.name;
      a.appendChild(nameEl);

      products.appendChild(a);
    });
  }

  async function fetchCategory(slug) {
    if (cache.has(slug)) return cache.get(slug);
    const res = await fetch(`/api/category-preview?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error('Failed to fetch category preview');
    const data = await res.json();
    cache.set(slug, data);
    return data;
  }

  async function showCategory(slug) {
    if (!slug || slug === '__default__') slug = defaultSlug;
    if (!slug) return;
    if (currentSlug === slug && cache.has(slug)) {
      // Already showing this one
      return;
    }
    currentSlug = slug;
    highlightSidebar(slug);
    viewAll.href = `/productos?categoria=${encodeURIComponent(slug)}`;

    if (cache.has(slug)) {
      const data = cache.get(slug);
      title.textContent = data.categoryName || '';
      renderProducts(data.products);
      return;
    }

    title.textContent = 'Cargando...';
    renderSkeleton();
    try {
      const data = await fetchCategory(slug);
      if (currentSlug !== slug) return; // user switched mid-flight
      title.textContent = data.categoryName || '';
      renderProducts(data.products);
    } catch {
      if (currentSlug !== slug) return;
      title.textContent = '';
      renderEmpty();
    }
  }

  // Wire triggers (pills + "Categorías" button)
  triggers.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cancelClose();
      const slug = el.getAttribute('data-slug');
      openPanel();
      showCategory(slug);
    });
    el.addEventListener('mouseleave', () => {
      scheduleClose();
    });
    // For the "Categorías" button (button element, not link): prevent navigation on click
    if (el.tagName === 'BUTTON') {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openPanel();
        showCategory(el.getAttribute('data-slug'));
      });
    }
  });

  // Panel hover — keep open
  panel.addEventListener('mouseenter', cancelClose);
  panel.addEventListener('mouseleave', scheduleClose);

  // Sidebar item hover — switch category
  sidebarItems.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cancelClose();
      showCategory(el.getAttribute('data-slug'));
    });
  });

  // Close on overlay click
  overlay.addEventListener('click', closePanel);

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closePanel();
  });

  // Track panel with nav on scroll (no gap, no close)
  window.addEventListener('scroll', () => {
    if (!isOpen) return;
    const navRect = nav.getBoundingClientRect();
    panel.style.top = Math.max(0, navRect.bottom) + 'px';
  }, { passive: true });
})();
