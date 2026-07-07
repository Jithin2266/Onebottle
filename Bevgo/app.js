document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('beverage-grid');
  const searchInput = document.getElementById('search-input');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const modalOverlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('close-btn');
  
  // Modal Elements
  const modalTitle = document.getElementById('modal-title');
  const modalCategory = document.getElementById('modal-category');
  const modalDesc = document.getElementById('modal-desc');
  const modalMix = document.getElementById('modal-mix');

  let currentFilter = 'All';
  let searchQuery = '';

  function renderDrinks() {
    grid.innerHTML = '';
    
    const filtered = beverages.filter(drink => {
      const matchesSearch = drink.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = currentFilter === 'All' || drink.category === currentFilter;
      return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-muted);">No drinks found matching your criteria.</p>';
      return;
    }

    filtered.forEach((drink, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.animationDelay = `${index * 0.1}s`;
      card.classList.add('fade-in');
      
      card.innerHTML = `
        <img src="${drink.image}" alt="${drink.name}" class="card-img" loading="lazy" />
        <div class="card-content">
          <div class="card-category">${drink.category}</div>
          <h2 class="card-title">${drink.name}</h2>
          <div class="card-price">${drink.price}</div>
        </div>
      `;

      card.addEventListener('click', () => openModal(drink));
      grid.appendChild(card);
    });
  }

  function openModal(drink) {
    modalTitle.textContent = drink.name;
    modalCategory.textContent = drink.category;
    modalDesc.textContent = drink.description;
    modalMix.textContent = drink.mixology;
    modalOverlay.classList.add('active');
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
  }

  // Event Listeners
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderDrinks();
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderDrinks();
    });
  });

  closeBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Initial render
  renderDrinks();
});
