import { db, utils } from './supabase.js';

class TransactionViewer {
  constructor() {
    this.filters = {};
    this.currentPage = 1;
    this.itemsPerPage = 20;
    this.transactions = [];
    this.deleteTransactionId = null;
    this.editTransactionId = null;
    this.init();
  }

  async init() {
    try {
      utils.showLoading();
      await this.loadFormData();
      await this.loadTransactions();
      this.setupEventListeners();
    } catch (error) {
      console.error('Error initializing transaction viewer:', error);
      utils.showNotification('Error loading data. Please check your Supabase configuration.', 'error');
    } finally {
      utils.hideLoading();
    }
  }

  async loadFormData() {
    const [accounts, categories] = await Promise.all([
      db.getAccounts(),
      db.getCategories()
    ]);

    this.accounts = accounts;
    this.categories = categories;
    this.populateFilterAccounts(accounts);
    this.populateFilterCategories(categories);
  }

  populateFilterAccounts(accounts) {
    const accountSelect = document.getElementById('filterAccount');
    if (!accountSelect) return;

    accountSelect.innerHTML = '<option value="">All Accounts</option>';
    
    accounts.forEach(account => {
      const option = document.createElement('option');
      option.value = account.id;
      option.textContent = `${account.name} (${account.type})`;
      accountSelect.appendChild(option);
    });
  }

  populateFilterCategories(categories) {
    const categorySelect = document.getElementById('filterCategory');
    if (!categorySelect) return;

    categorySelect.innerHTML = '<option value="">All Categories</option>';
    
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = `${category.name} (${category.type})`;
      categorySelect.appendChild(option);
    });
  }

  setupEventListeners() {
    // Filter form submission
    const filtersForm = document.getElementById('filtersForm');
    if (filtersForm) {
      filtersForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFilterSubmit();
      });
    }

    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        this.clearFilters();
      });
    }

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportTransactions();
      });
    }

    // Delete modal functionality
    const deleteModal = document.getElementById('deleteModal');
    const deleteCloseBtn = deleteModal?.querySelector('.close');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    if (deleteCloseBtn) {
      deleteCloseBtn.addEventListener('click', () => this.closeDeleteModal());
    }

    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
    }

    if (deleteModal) {
      window.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
          this.closeDeleteModal();
        }
      });
    }

    // Edit modal functionality
    const editModal = document.getElementById('editModal');
    const editCloseBtn = editModal?.querySelector('.close');
    const editForm = document.getElementById('editTransactionForm');
    
    if (editCloseBtn) {
      editCloseBtn.addEventListener('click', () => this.closeEditModal());
    }

    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleEditSubmit();
      });
    }

    if (editModal) {
      window.addEventListener('click', (e) => {
        if (e.target === editModal) {
          this.closeEditModal();
        }
      });
    }
  }

  async handleFilterSubmit() {
    try {
      utils.showLoading();

      const formData = new FormData(document.getElementById('filtersForm'));
      this.filters = {
        date_from: formData.get('date_from') || null,
        date_to: formData.get('date_to') || null,
        account_id: formData.get('account_id') || null,
        type: formData.get('type') || null,
        category_id: formData.get('category_id') || null
      };

      // Remove null values
      Object.keys(this.filters).forEach(key => {
        if (!this.filters[key]) {
          delete this.filters[key];
        }
      });

      this.currentPage = 1;
      await this.loadTransactions();

    } catch (error) {
      console.error('Error applying filters:', error);
      utils.showNotification('Error applying filters. Please try again.', 'error');
    } finally {
      utils.hideLoading();
    }
  }

  clearFilters() {
    document.getElementById('filtersForm').reset();
    this.filters = {};
    this.currentPage = 1;
    this.loadTransactions();
  }

  async loadTransactions() {
    try {
      this.transactions = await db.getTransactions(this.filters);
      this.renderTransactions();
      this.renderSummary();
      this.renderPagination();
    } catch (error) {
      console.error('Error loading transactions:', error);
      throw error;
    }
  }

  renderTransactions() {
    const tbody = document.getElementById('transactionsBody');
    if (!tbody) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedTransactions = this.transactions.slice(startIndex, endIndex);

    if (paginatedTransactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            No transactions found matching your criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = paginatedTransactions.map(transaction => `
      <tr>
        <td>${utils.formatDate(transaction.date)}</td>
        <td>${transaction.description || '-'}</td>
        <td>${transaction.categories?.name || 'Uncategorized'}</td>
        <td>${transaction.subcategories?.name || '-'}</td>
        <td>${transaction.accounts?.name || 'Unknown'}</td>
        <td>
          <span class="transaction-type ${transaction.type}">${transaction.type}</span>
        </td>
        <td class="${transaction.type === 'income' ? 'amount-positive' : 'amount-negative'}">
          ${transaction.type === 'income' ? '+' : '-'}${utils.formatCurrency(transaction.amount)}
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-small btn-secondary" onclick="window.transactionViewer.openEditModal('${transaction.id}')">
              Edit
            </button>
            <button class="btn btn-small btn-danger" onclick="window.transactionViewer.openDeleteModal('${transaction.id}')">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderSummary() {
    const totals = this.transactions.reduce((acc, transaction) => {
      if (transaction.type === 'income') {
        acc.income += parseFloat(transaction.amount);
      } else {
        acc.expense += parseFloat(transaction.amount);
      }
      acc.count++;
      return acc;
    }, { income: 0, expense: 0, count: 0 });

    const net = totals.income - totals.expense;

    // Update summary elements
    const totalIncomeElement = document.getElementById('totalIncomeFiltered');
    const totalExpensesElement = document.getElementById('totalExpensesFiltered');
    const netAmountElement = document.getElementById('netAmountFiltered');
    const totalTransactionsElement = document.getElementById('totalTransactionsFiltered');

    if (totalIncomeElement) {
      totalIncomeElement.textContent = utils.formatCurrency(totals.income);
    }

    if (totalExpensesElement) {
      totalExpensesElement.textContent = utils.formatCurrency(totals.expense);
    }

    if (netAmountElement) {
      netAmountElement.textContent = utils.formatCurrency(net);
      netAmountElement.className = `summary-amount ${net >= 0 ? 'income' : 'expense'}`;
    }

    if (totalTransactionsElement) {
      totalTransactionsElement.textContent = totals.count.toString();
    }
  }

  renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    const totalPages = Math.ceil(this.transactions.length / this.itemsPerPage);
    
    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    let paginationHTML = `
      <button ${this.currentPage === 1 ? 'disabled' : ''} onclick="window.transactionViewer.goToPage(${this.currentPage - 1})">
        Previous
      </button>
    `;

    // Show page numbers
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, this.currentPage + 2);

    if (startPage > 1) {
      paginationHTML += `<button onclick="window.transactionViewer.goToPage(1)">1</button>`;
      if (startPage > 2) {
        paginationHTML += `<span>...</span>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <button class="${i === this.currentPage ? 'active' : ''}" onclick="window.transactionViewer.goToPage(${i})">
          ${i}
        </button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHTML += `<span>...</span>`;
      }
      paginationHTML += `<button onclick="window.transactionViewer.goToPage(${totalPages})">${totalPages}</button>`;
    }

    paginationHTML += `
      <button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="window.transactionViewer.goToPage(${this.currentPage + 1})">
        Next
      </button>
    `;

    pagination.innerHTML = paginationHTML;
  }

  goToPage(page) {
    this.currentPage = page;
    this.renderTransactions();
    this.renderPagination();
    
    // Scroll to top of table
    document.getElementById('transactionsTable').scrollIntoView({ behavior: 'smooth' });
  }

  exportTransactions() {
    if (this.transactions.length === 0) {
      utils.showNotification('No transactions to export.', 'warning');
      return;
    }

    const exportData = this.transactions.map(transaction => ({
      Date: utils.formatDate(transaction.date),
      Description: transaction.description || '',
      Category: transaction.categories?.name || 'Uncategorized',
      Subcategory: transaction.subcategories?.name || '',
      Account: transaction.accounts?.name || 'Unknown',
      Type: transaction.type,
      Amount: transaction.amount
    }));

    const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    utils.exportToCSV(exportData, filename);
    utils.showNotification('Transactions exported successfully!', 'success');
  }

  openDeleteModal(transactionId) {
    this.deleteTransactionId = transactionId;
    const modal = document.getElementById('deleteModal');
    if (modal) {
      modal.style.display = 'block';
    }
  }

  closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
      modal.style.display = 'none';
      this.deleteTransactionId = null;
    }
  }

  async confirmDelete() {
    if (!this.deleteTransactionId) return;

    try {
      utils.showLoading();
      await db.deleteTransaction(this.deleteTransactionId);
      utils.showNotification('Transaction deleted successfully!', 'success');
      
      this.closeDeleteModal();
      await this.loadTransactions();
      
    } catch (error) {
      console.error('Error deleting transaction:', error);
      utils.showNotification('Error deleting transaction. Please try again.', 'error');
    } finally {
      utils.hideLoading();
    }
  }

  async openEditModal(transactionId) {
    this.editTransactionId = transactionId;
    const transaction = this.transactions.find(t => t.id === transactionId);
    
    if (!transaction) return;

    // Populate edit form
    document.getElementById('editTransactionType').value = transaction.type;
    document.getElementById('editAccountId').value = transaction.account_id;
    document.getElementById('editAmount').value = transaction.amount;
    document.getElementById('editCategoryId').value = transaction.category_id;
    document.getElementById('editSubcategoryId').value = transaction.subcategory_id || '';
    document.getElementById('editDescription').value = transaction.description || '';
    document.getElementById('editTransactionDate').value = transaction.date;

    // Populate account options
    const accountSelect = document.getElementById('editAccountId');
    accountSelect.innerHTML = '<option value="">Select Account</option>';
    this.accounts.forEach(account => {
      const option = document.createElement('option');
      option.value = account.id;
      option.textContent = `${account.name} (${account.type})`;
      if (account.id === transaction.account_id) option.selected = true;
      accountSelect.appendChild(option);
    });

    // Populate category options
    const categorySelect = document.getElementById('editCategoryId');
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    this.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = `${category.name} (${category.type})`;
      option.dataset.type = category.type;
      if (category.id === transaction.category_id) option.selected = true;
      categorySelect.appendChild(option);
    });

    // Load subcategories for the selected category
    if (transaction.category_id) {
      await this.populateEditSubcategories(transaction.category_id, transaction.subcategory_id);
    }

    const modal = document.getElementById('editModal');
    if (modal) {
      modal.style.display = 'block';
    }
  }

  async populateEditSubcategories(categoryId, selectedSubcategoryId = null) {
    const subcategorySelect = document.getElementById('editSubcategoryId');
    if (!subcategorySelect) return;

    subcategorySelect.innerHTML = '<option value="">Select Subcategory (Optional)</option>';

    if (!categoryId) return;

    try {
      const subcategories = await db.getSubcategories(categoryId);
      
      subcategories.forEach(subcategory => {
        const option = document.createElement('option');
        option.value = subcategory.id;
        option.textContent = subcategory.name;
        if (subcategory.id === selectedSubcategoryId) option.selected = true;
        subcategorySelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  }

  closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
      modal.style.display = 'none';
      this.editTransactionId = null;
    }
  }

  async handleEditSubmit() {
    if (!this.editTransactionId) return;

    try {
      utils.showLoading();

      const formData = new FormData(document.getElementById('editTransactionForm'));
      const updatedTransaction = {
        account_id: formData.get('account_id'),
        type: formData.get('type'),
        category_id: formData.get('category_id'),
        subcategory_id: formData.get('subcategory_id') || null,
        amount: parseFloat(formData.get('amount')),
        description: formData.get('description') || null,
        date: formData.get('date')
      };

      // Validate required fields
      if (!updatedTransaction.account_id || !updatedTransaction.type || !updatedTransaction.category_id || !updatedTransaction.amount || !updatedTransaction.date) {
        utils.showNotification('Please fill in all required fields.', 'error');
        return;
      }

      if (updatedTransaction.amount <= 0) {
        utils.showNotification('Amount must be greater than zero.', 'error');
        return;
      }

      await db.updateTransaction(this.editTransactionId, updatedTransaction);
      
      utils.showNotification('Transaction updated successfully!', 'success');
      this.closeEditModal();
      await this.loadTransactions();

    } catch (error) {
      console.error('Error updating transaction:', error);
      utils.showNotification('Error updating transaction. Please try again.', 'error');
    } finally {
      utils.hideLoading();
    }
  }
}

// Global functions for pagination and modal operations
window.goToPage = (page) => {
  if (window.transactionViewer) {
    window.transactionViewer.goToPage(page);
  }
};

window.openDeleteModal = (transactionId) => {
  if (window.transactionViewer) {
    window.transactionViewer.openDeleteModal(transactionId);
  }
};

window.closeDeleteModal = () => {
  if (window.transactionViewer) {
    window.transactionViewer.closeDeleteModal();
  }
};

window.openEditModal = (transactionId) => {
  if (window.transactionViewer) {
    window.transactionViewer.openEditModal(transactionId);
  }
};

window.closeEditModal = () => {
  if (window.transactionViewer) {
    window.transactionViewer.closeEditModal();
  }
};

// Initialize transaction viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.transactionViewer = new TransactionViewer();
});