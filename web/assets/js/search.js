/**
 * Pet Universe — Search Autocomplete
 * Wires up both desktop (#search-input) and mobile (#search-input-mobile) inputs.
 */
(function() {
  const DEBOUNCE_MS = 300;
  const MIN_CHARS = 2;

  function setupSearch(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    let debounceTimer = null;

    input.addEventListener('input', function() {
      const query = this.value.trim();
      clearTimeout(debounceTimer);

      if (query.length < MIN_CHARS) {
        dropdown.replaceChildren();
        return;
      }

      debounceTimer = setTimeout(() => fetchResults(query, dropdown), DEBOUNCE_MS);
    });

    // Close dropdown on outside click
    const searchForm = input.closest('form');
    document.addEventListener('click', function(e) {
      if (e.target === input) return;
      if (dropdown.contains(e.target)) return;
      if (searchForm && searchForm.contains(e.target)) return;
      dropdown.replaceChildren();
    });
  }

  async function fetchResults(query, dropdown) {
    try {
      const res = await fetch(`/buscar?q=${encodeURIComponent(query)}&ajax=1`);
      const data = await res.json();
      renderDropdown(data.hits || [], query, dropdown);
    } catch {
      dropdown.replaceChildren();
    }
  }

  function renderDropdown(hits, query, dropdown) {
    dropdown.replaceChildren();

    if (hits.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'search-result-item';
      noResults.textContent = 'No se encontraron resultados';
      dropdown.appendChild(noResults);
      return;
    }

    hits.slice(0, 5).forEach(hit => {
      const link = document.createElement('a');
      link.href = `/producto/${hit.slug}`;
      link.className = 'search-result-item';

      const info = document.createElement('div');

      const name = document.createElement('div');
      name.className = 'search-result-name';
      name.textContent = hit.name;
      info.appendChild(name);

      const meta = document.createElement('div');
      meta.className = 'search-result-meta';
      meta.textContent = [hit.brand, hit.categoryName].filter(Boolean).join(' · ');
      info.appendChild(meta);

      link.appendChild(info);

      const price = document.createElement('span');
      price.className = 'search-result-price';
      price.textContent = '$' + Math.round(leadPrice(hit)).toLocaleString('es-AR');
      link.appendChild(price);

      dropdown.appendChild(link);
    });

    // "View all" link
    const viewAll = document.createElement('a');
    viewAll.href = `/buscar?q=${encodeURIComponent(query)}`;
    viewAll.className = 'search-view-all';
    viewAll.textContent = 'Ver todos los resultados';
    dropdown.appendChild(viewAll);
  }

  setupSearch('search-input', 'search-autocomplete');
  setupSearch('search-input-mobile', 'search-autocomplete-mobile');
})();
