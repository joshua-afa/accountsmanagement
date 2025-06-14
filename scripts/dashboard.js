import { db, utils } from './supabase.js';

class Dashboard {
  constructor() {
    this.init();
  }

  async init() {
    try {
      utils.showLoading();
      await this.loadDashboardData();
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      utils.showNotification('Error loading dashboard data. Please check your Supabase configuration.', 'error');
    } finally {
      utils.hideLoading();
    }
  }

  async loadDashboardData() {
    const user_id = await db.getUserId();
    const currentMonth = utils.getCurrentMonth();
    
    // Load all data in parallel
    const [
      accounts,
      monthlyTotals,
      recentTransactions,
      categoryBreakdown,
      totalBalance
    ] = await Promise.all([
      db.getAccounts(user_id),
      db.getMonthlyTotals(currentMonth.year, currentMonth.month,user_id),
      db.getTransactions({ limit: 5,user_id }),
      db.getCategoryBreakdown(currentMonth.year, currentMonth.month,user_id),
      db.getTotalBalance(user_id)
    ]);

    this.renderTotalBalance(totalBalance);
    this.renderMonthlyStats(monthlyTotals);
    this.renderAccounts(accounts);
    this.renderRecentTransactions(recentTransactions);
    this.renderCategoryBreakdown(categoryBreakdown);
  }

  renderTotalBalance(balance) {
    const totalBalanceElement = document.getElementById('totalBalance');
    if (totalBalanceElement) {
      totalBalanceElement.textContent = utils.formatCurrency(balance);
    }
  }

  renderMonthlyStats(totals) {
    const monthlyIncomeElement = document.getElementById('monthlyIncome');
    const monthlyExpensesElement = document.getElementById('monthlyExpenses');

    if (monthlyIncomeElement) {
      monthlyIncomeElement.textContent = utils.formatCurrency(totals.income);
    }

    if (monthlyExpensesElement) {
      monthlyExpensesElement.textContent = utils.formatCurrency(totals.expense);
    }
  }

  renderAccounts(accounts) {
    const accountsGrid = document.getElementById('accountsGrid');
    if (!accountsGrid) return;

    if (accounts.length === 0) {
      accountsGrid.innerHTML = `
        <div class="empty-state">
          <p>No accounts found. <a href="categories.html">Add your first account</a> to get started.</p>
        </div>
      `;
      return;
    }

    accountsGrid.innerHTML = accounts.map(account => `
      <div class="account-card">
        <div class="account-header">
          <div class="account-name">${account.name}</div>
          <div class="account-type">${account.type}</div>
        </div>
        <div class="account-balance">${utils.formatCurrency(account.balance || 0)}</div>
        ${account.bank_name ? `<div class="account-bank">${account.bank_name}</div>` : ''}
      </div>
    `).join('');
  }

  renderRecentTransactions(transactions) {
    const tbody = document.getElementById('recentTransactionsBody');
    if (!tbody) return;

    if (transactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            No transactions found. <a href="add.html">Add your first transaction</a> to get started.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = transactions.map(transaction => `
      <tr>
        <td>${utils.formatDate(transaction.date)}</td>
        <td>${transaction.description || '-'}</td>
        <td>
          ${transaction.categories?.name || 'Uncategorized'}
          ${transaction.subcategories?.name ? `<br><small style="color: var(--text-secondary);">${transaction.subcategories.name}</small>` : ''}
        </td>
        <td>${transaction.accounts?.name || 'Unknown'}</td>
        <td class="${transaction.type === 'income' ? 'amount-positive' : 'amount-negative'}">
          ${transaction.type === 'income' ? '+' : '-'}${utils.formatCurrency(transaction.amount)}
        </td>
      </tr>
    `).join('');
  }

  renderCategoryBreakdown(breakdown) {
    const categoryList = document.getElementById('categoryBreakdown');
    if (!categoryList) return;

    if (breakdown.length === 0) {
      categoryList.innerHTML = `
        <div class="empty-state">
          <p>No expense data for this month.</p>
        </div>
      `;
      return;
    }

    // Generate colors for categories
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', 
      '#84cc16', '#22c55e', '#10b981', '#14b8a6',
      '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
      '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
    ];

    categoryList.innerHTML = breakdown.slice(0, 8).map((category, index) => `
      <div class="category-breakdown-item">
        <div class="category-info">
          <div class="category-color" style="background-color: ${colors[index % colors.length]}"></div>
          <div class="category-breakdown-name">${category.name}</div>
        </div>
        <div class="category-breakdown-amount">${utils.formatCurrency(category.amount)}</div>
      </div>
    `).join('');
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new Dashboard();
});