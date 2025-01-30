let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let baseCurrency = 'KES'; // Default base currency

// Initialize Chart
const ctx = document.getElementById('categoryChart').getContext('2d');
let categoryChart;

// Fetch Exchange Rates (Frankfurter API)
async function fetchExchangeRate(currency, date = 'latest') {
  try {
    const response = await fetch(`https://api.frankfurter.app/${date}?from=${currency}`);
    const data = await response.json();
    return data.rates[baseCurrency];
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return 1; // Fallback to 1:1 if API fails
  }
}

// Add Expense
document.getElementById('expenseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('amount').value);
  const currency = document.getElementById('currency').value;
  const description = document.getElementById('description').value;
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;
  const recurrence = document.getElementById('recurrence').value;

  // Convert to base currency
  const rate = await fetchExchangeRate(currency);
  const convertedAmount = currency === baseCurrency ? amount : amount * rate;

  const expense = {
    id: Date.now(),
    amount,
    currency,
    convertedAmount,
    description,
    category,
    date
  };

  expenses.push(expense);

  if (recurrence !== 'once') {
    const today = new Date(expense.date);
    let nextDate = new Date(today);
    
    // Generate recurring expenses (example for 12 months)
    for (let i = 0; i < 12; i++) {
      const clonedExpense = { ...expense, id: Date.now() + i };
      clonedExpense.date = nextDate.toISOString().split('T')[0]; // Update date

      expenses.push(clonedExpense);
      
      // Update next date based on recurrence
      if (recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
      else if (recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      else if (recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    }
  }

  localStorage.setItem('expenses', JSON.stringify(expenses));
  updateUI();
  e.target.reset();
});

// Checking the currency selected
async function updateBaseCurrency() {
  baseCurrency = document.getElementById('baseCurrency').value;

  // Update Converted Amounts for All Expenses
  await Promise.all(expenses.map(async expense => {
    const rate = await fetchExchangeRate(expense.currency);
    expense.convertedAmount = expense.currency === baseCurrency ? expense.amount : expense.amount * rate;
  }));

  // Save Updated Expenses to Local Storage
  localStorage.setItem('expenses', JSON.stringify(expenses));

  updateUI();
}


// Render Expenses
function renderExpenses() {
  const expenseBody = document.getElementById('expenseBody');
  expenseBody.innerHTML = '';
  expenses.forEach(expense => {
    const row = `
      <tr>
        <td>${expense.date}</td>
        <td>${expense.category}</td>
        <td>${expense.description}</td>
        <td>${expense.convertedAmount.toFixed(2)} ${baseCurrency}</td>
        <td>${expense.currency}</td>
        <td>
          <button onclick="deleteExpense(${expense.id})">Delete</button>
        </td>
      </tr>
    `;
    expenseBody.innerHTML += row;
  });
}



// Delete Expense
function deleteExpense(id) {
  expenses = expenses.filter(expense => expense.id !== id);
  localStorage.setItem('expenses', JSON.stringify(expenses));
  updateUI();
}

// Update Budget Alert
function updateBudgetAlert(total) {
  const budgetAlert = document.getElementById('budgetAlert');
  if (budget > 0) {
    const remaining = budget - total;
    budgetAlert.textContent = remaining >= 0 
      ? `Remaining: ${remaining.toFixed(2)} ${baseCurrency}` 
      : `Over budget by ${Math.abs(remaining).toFixed(2)} ${baseCurrency}`;
    budgetAlert.style.color = remaining >= 0 ? 'var(--primary-color)' : '#ff0000';
  }
}

// Update Total and Chart
function updateUI() {
  // Update Total
  const total = expenses.reduce((sum, expense) => sum + expense.convertedAmount, 0);
  document.getElementById('totalAmount').textContent = total.toFixed(2);

  // Update Budget Alert
  updateBudgetAlert(total);

  // Update Expense List
  renderExpenses();

  // Update Chart
  const categories = [...new Set(expenses.map(expense => expense.category))];
  const amounts = categories.map(cat => 
    expenses.filter(expense => expense.category === cat)
      .reduce((sum, expense) => sum + expense.convertedAmount, 0)
  );

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: categories,
      datasets: [{
        data: amounts,
        backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#E91E63']
      }]
    }
  });
  // Save Updated Expenses to Local Storage
  localStorage.setItem('expenses', JSON.stringify(expenses));  
}

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
let isDarkMode = localStorage.getItem('theme') === 'dark';

function setTheme() {
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  themeToggle.textContent = isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  
  // Update chart colors (destroy and recreate chart)
  if (categoryChart) {
    categoryChart.destroy();
    updateUI();
  }
}

themeToggle.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  setTheme();
});

let budget = localStorage.getItem('budget') || 0;

function setBudget() {
  budget = parseFloat(document.getElementById('monthlyBudget').value);
  localStorage.setItem('budget', budget);
  updateUI();
}

document.addEventListener('DOMContentLoaded', () => {
  isDarkMode = localStorage.getItem('theme') === 'dark';
  setTheme();
  expenses = JSON.parse(localStorage.getItem('expenses')) || [];
  updateUI();
});

document.getElementById('baseCurrency').addEventListener('change', updateBaseCurrency);
