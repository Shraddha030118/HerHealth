/**
 * HerHealth AI — Nutrition & Hydration Frontend Controller
 */

let nutritionData = null;
let currentMealFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuthAndInitUI();
  if (!user) return;

  setupHydration();
  setupMealFilters();
  await loadNutritionData();
  await loadHydration();
});

// ==========================================
// 1. Hydration Controller
// ==========================================
async function loadHydration() {
  try {
    const data = await apiFetch('/api/wellness/hydration');
    if (data.success && data.hydration) {
      updateHydrationUI(data.hydration);
    }
  } catch (err) {
    console.error('Error loading hydration:', err);
  }
}

function updateHydrationUI(hydration) {
  const mlText = document.getElementById('hydration-ml-text');
  const glassesText = document.getElementById('hydration-glasses-text');
  const fillBar = document.getElementById('hydration-fill-bar');

  const amount = hydration.amountMl || 0;
  const goal = hydration.goalMl || 2000;
  const glasses = hydration.glasses || 0;
  const goalGlasses = Math.round(goal / 250);

  if (mlText) mlText.textContent = `${amount} / ${goal} ml`;
  if (glassesText) glassesText.textContent = `${glasses} of ${goalGlasses} standard glasses (250ml)`;

  if (fillBar) {
    const pct = Math.min(100, Math.round((amount / goal) * 100));
    fillBar.style.height = `${pct}%`;
  }
}

function setupHydration() {
  const addBtn = document.getElementById('add-water-glass-btn');
  const resetBtn = document.getElementById('reset-water-btn');

  addBtn?.addEventListener('click', async () => {
    try {
      const res = await apiFetch('/api/wellness/hydration', {
        method: 'POST',
        body: { addGlasses: 1 }
      });
      updateHydrationUI(res.hydration);

      // Sync to Cloud Firestore
      if (window.HerHealthFirebaseService) {
        window.HerHealthFirebaseService.firestoreSaveHydration(res.hydration.amountMl, res.hydration.glasses);
      }

      showToast('Added 250ml water! Stay refreshed 💧', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  resetBtn?.addEventListener('click', async () => {
    try {
      const res = await apiFetch('/api/wellness/hydration', {
        method: 'POST',
        body: { customAmountMl: 0 }
      });
      updateHydrationUI(res.hydration);

      // Sync to Cloud Firestore
      if (window.HerHealthFirebaseService) {
        window.HerHealthFirebaseService.firestoreSaveHydration(0, 0);
      }

      showToast('Hydration tracker reset for today.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// ==========================================
// 2. Nutrition Catalog & Meal Suggestions
// ==========================================
async function loadNutritionData() {
  try {
    const res = await apiFetch('/api/nutrition');
    nutritionData = res.data;
    renderFoodCategories(nutritionData.categories);
    renderMeals(nutritionData.meals);
  } catch (err) {
    showToast('Failed to load nutrition information: ' + err.message, 'error');
  }
}

function renderFoodCategories(categories) {
  const container = document.getElementById('food-categories-container');
  if (!container || !categories) return;

  container.innerHTML = '';
  categories.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'food-card';

    const foodsList = cat.foods.map(f => `
      <div style="margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--border-color);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:0.92rem;">${escapeHtml(f.name)}</strong>
          <span class="badge ${f.vegetarian ? 'badge-low' : 'badge-lavender'}">${f.vegetarian ? '🌱 Veg' : '🍗 Non-Veg'}</span>
        </div>
        <div style="font-size:0.8rem; color:var(--primary-600); font-weight:600;">${escapeHtml(f.serving)}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(f.tips)}</div>
      </div>
    `).join('');

    card.innerHTML = `
      <div>
        <h3 style="font-size:1.2rem; margin-bottom:4px;">${escapeHtml(cat.name)}</h3>
        <div style="font-size:0.82rem; color:var(--text-light); font-weight:600; margin-bottom:10px;">
          ${escapeHtml(cat.subtitle)}
        </div>
        <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:16px;">
          ${escapeHtml(cat.benefits)}
        </p>
        <div>${foodsList}</div>
      </div>
    `;

    container.appendChild(card);
  });
}

function renderMeals(meals) {
  const container = document.getElementById('meals-container');
  if (!container || !meals) return;

  container.innerHTML = '';
  const sections = [
    { key: 'breakfast', title: 'Breakfast' },
    { key: 'lunch', title: 'Lunch' },
    { key: 'snacks', title: 'Evening Snacks & Teas' },
    { key: 'dinner', title: 'Dinner' }
  ];

  sections.forEach(sec => {
    const list = meals[sec.key] || [];
    const filteredList = list.filter(m => {
      if (currentMealFilter === 'veg') return m.type === 'Vegetarian';
      if (currentMealFilter === 'nonveg') return m.type === 'Non-Vegetarian';
      return true;
    });

    if (filteredList.length === 0) return;

    const secTitle = document.createElement('h4');
    secTitle.style.cssText = 'font-size:1rem; margin:16px 0 8px; color:var(--text-main); font-weight:700;';
    secTitle.textContent = sec.title;
    container.appendChild(secTitle);

    filteredList.forEach(m => {
      const card = document.createElement('div');
      card.className = 'meal-plan-card';
      card.innerHTML = `
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <strong style="font-size:0.95rem;">${escapeHtml(m.name)}</strong>
            <span class="badge ${m.type === 'Vegetarian' ? 'badge-low' : 'badge-lavender'}">${m.type}</span>
          </div>
          <p style="font-size:0.86rem; color:var(--text-muted); margin-bottom:6px;">${escapeHtml(m.description)}</p>
          <div style="font-size:0.8rem; color:var(--primary-700); font-weight:600;">Benefit: ${escapeHtml(m.benefit)}</div>
        </div>
      `;
      container.appendChild(card);
    });
  });
}

function setupMealFilters() {
  const allBtn = document.getElementById('meal-filter-all');
  const vegBtn = document.getElementById('meal-filter-veg');
  const nonvegBtn = document.getElementById('meal-filter-nonveg');

  function setActive(btn, filter) {
    [allBtn, vegBtn, nonvegBtn].forEach(b => b?.classList.remove('active'));
    btn?.classList.add('active');
    currentMealFilter = filter;
    if (nutritionData) renderMeals(nutritionData.meals);
  }

  allBtn?.addEventListener('click', () => setActive(allBtn, 'all'));
  vegBtn?.addEventListener('click', () => setActive(vegBtn, 'veg'));
  nonvegBtn?.addEventListener('click', () => setActive(nonvegBtn, 'nonveg'));
}
