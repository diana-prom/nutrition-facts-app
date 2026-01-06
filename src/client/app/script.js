const form = document.getElementById('form');
const textField = document.getElementById('textBox');
const searchButton = document.getElementById('search-btn');
const clearButton = document.getElementById('clear-btn');
const errorMessage = document.getElementById('error');
const resultText = document.getElementById('mytext');
const warningIcon = document.getElementById('warning-icon');

// --- Helpers ---
const showElement = (el) => el && (el.style.display = 'block');
const hideElement = (el) => el && (el.style.display = 'none');

const UI_STATES = {
  default: {
    resultText: 'Nutrition Facts:',
    protein: 'Protein: N/A',
    fat: 'Fat: N/A',
    carbs: 'Carbohydrates: N/A',
    category: 'Category: N/A',
    amount: 'Amount: N/A',
    weight: 'Gram Weight: N/A',
    unit: 'Measure unit: N/A',
    proteinCal: 'Protein calories: N/A',
    fatCal: 'Fat cal: N/A',
    carbsCal: 'Carbohydrates cal: N/A',
    totalCal: 'Total Cal: N/A'
  },
  loading: {
    protein: 'Protein: loading...',
    fat: 'Fat: loading...',
    carbs: 'Carbohydrates: loading...',
    category: 'Category: loading...',
    amount: 'Amount: loading...',
    weight: 'Weight: loading...',
    unit: 'Unit: loading...',
    proteinCal: 'Protein cal: loading...',
    fatCal: 'Fat cal: loading...',
    carbsCal: 'Carbohydrates cal: loading...',
    totalCal: 'Total calories: loading'
  }
};

const UI_PARTIAL_STATES = {
  portionDefault: {
    amount: 'Amount: N/A',
    weight: 'Gram Weight: N/A',
    unit: 'Measure unit: N/A'
  }
};

function applyUIState(state) {
  if (state.resultText !== undefined) {
    resultText.textContent = state.resultText;
  }

  if (state.protein !== undefined) {
    document.querySelector('#firstRow .column2').textContent = state.protein;
  }
  if (state.fat !== undefined) {
    document.querySelector('#firstRow .column3').textContent = state.fat;
  }
  if (state.carbs !== undefined) {
    document.querySelector('#firstRow .column4').textContent = state.carbs;
  }

  if (state.category !== undefined) {
    document.getElementById('food-category').textContent = state.category;
  }

  if (state.amount !== undefined) {
    document.getElementById('food-amount').textContent = state.amount;
  }
  if (state.weight !== undefined) {
    document.getElementById('food-weight').textContent = state.weight;
  }
  if (state.unit !== undefined) {
    document.getElementById('food-measure-unit').textContent = state.unit;
  }
  if (state.proteinCal !== undefined) {
    document.getElementById('protein-cal').textContent = state.proteinCal;
  }
  if (state.fatCal !== undefined) {
    document.getElementById('fat-cal').textContent = state.fatCal;
  }
  if (state.carbsCal !== undefined) {
    document.getElementById('carbs-cal').textContent = state.carbsCal;
  }
  if (state.totalCal != undefined) {
    document.getElementById('total-calories').textContent = state.totalCal;
  }
}


// ---- Success helper ----
function applyFoodSuccessUI(food) {
  const proteinCalories = calculateCalories(food.proteinValue, 4);
  const fatCalories = calculateCalories(food.fatValue, 9);
  const carbCalories = calculateCalories(food.carbohydrateValue, 4);
  const totalCalories =
    (proteinCalories ?? 0) + (fatCalories ?? 0) + (carbCalories ?? 0);

  applyUIState({
    resultText: `Nutrition Facts: ${food.description}`,

    protein: `Protein: ${food.proteinValue ?? 'N/A'} g`,
    fat: `Fat: ${food.fatValue ?? 'N/A'} g`,
    carbs: `Carbohydrates: ${food.carbohydrateValue ?? 'N/A'} g`,

    category: `${food.category ?? 'N/A'}`,

    proteinCal: `Protein: ${proteinCalories ? proteinCalories + ' calories' : 'N/A'}`,
    fatCal: `Fat: ${fatCalories ? fatCalories + ' calories' : 'N/A'}`,
    carbsCal: `Carbohydrates: ${carbCalories ? carbCalories + ' calories' : 'N/A'}`,
    totalCal: `${totalCalories ? totalCalories + ' total calories' : 'N/A'}`
  });
}



// --- reset state (404, errors) ---
function resetNutritionUI() {
  applyUIState(UI_STATES.default);
}

const API_BASE = 'http://localhost:8080/api/food';


async function apiFetch(url) {
  const res = await fetch(url);

  let body = null;
  try {
    body = await res.json();
  } catch (_) { }

  if (!res.ok) {
    const error = new Error(body?.message || 'Request failed');
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return body;
}

/** 
 * Searches for a food by name and updates the UI with Nutrition data.
 * Displays macro values, calories per macro, category description and total calories.
 * @returns {Promise<void>}
 */
async function searchFood() {
  const name = textField.value.trim();
  if (!name) return;

  try {

    applyUIState(UI_STATES.loading);


    const food = await apiFetch(
      `${API_BASE}/search/best?name=${encodeURIComponent(name)}`
    );

    // ---- Success UI ----
    resultText.textContent = `Nutrition Facts: ${food.description}`;

    applyFoodSuccessUI(food);

    if (food.fdcId) {
      fetchPortion(food.fdcId);
    }

    hideError();

  } catch (err) {
    console.error('Error fetching food:', err);

    // 404 — food not found
    if (err.status === 404) {
      showError(err.body?.message || `Food not found`);
    } else {
      showError('Something went wrong. Please try again.');
    }

    // ---- Clear All loading / stale UI ----
    applyUIState(UI_STATES.default);

  }
}

/** 
 * Fetches portion data for a food using its FDC ID.
 * Updates the UI with portion amount, unit, and gram weight.
 * @param {number|string} fdcId - FoodData Central ID
 * @returns {Promise<void>}
 */
async function fetchPortion(fdcId) {

  try {
    const portion = await apiFetch(
      `${API_BASE}/portion?fdc_id=${fdcId}`
    );

    applyUIState({
      amount: `${portion.amount ?? 'N/A'}`,
      unit: `${portion.unitName ? portion.unitName + ' (s)' : 'N/A'}`,
      weight: `per ${portion.gramWeight ?? 'N/A'} g`

    });
  }

  catch (err) {
    console.error(err);
    applyUIState(UI_PARTIAL_STATES.portionDefault);
  }
}

function calculateCalories(grams, caloriesPerGram) {
  if (grams == null || isNaN(grams)) return null;
  return Math.round(grams * caloriesPerGram);
}

// --- Event listeners ---
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (validateInput(textField.value)) {
    searchFood();
  }
});


function showError(msg = 'Required!') {
  if (!errorMessage || !textField) return;
  errorMessage.textContent = msg;
  showElement(errorMessage);
  textField.classList.add('invalid');
  warningIcon?.classList.add('show-icon');
  showElement(warningIcon);
}

function hideError() {
  if (!errorMessage || !textField) return;
  errorMessage.textContent = '';
  hideElement(errorMessage);
  textField.classList.remove('invalid');
  warningIcon?.classList.remove('show-icon');
  hideElement(warningIcon);
}

// --- Validation ---
function validateInput(value) {
  if (!value.trim()) {
    showError('Please enter a food name');
    hideElement(clearButton);
    return false;
  }
  hideError();
  showElement(clearButton);
  return true;
}

// --- Clear button ---
clearButton?.addEventListener('click', () => {
  textField.value = '';
  hideError();
  hideElement(clearButton);
  applyUIState(UI_STATES.default);
});

// --- Show clear button only when typing --
textField.addEventListener("input", () => {
  clearButton.style.display = textField.value ? "inline-flex" : "none";
})

document.addEventListener('DOMContentLoaded', () => {
  applyUIState(UI_STATES.default);
});
