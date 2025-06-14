import { db, utils } from './supabase.js';

class AddTransaction {
  constructor() {
    this.form = document.getElementById('transactionForm');
    this.init();
  }

  async init() {
    try {
      utils.showLoading();
      await this.loadFormData();
      this.setupEventListeners();
      this.setDefaultDate();
    } catch (error) {
      console.error('Error initializing add transaction form:', error);
      utils.showNotification('Error loading form data. Please check your Supabase configuration.', 'error');
    } finally {
      utils.hideLoading();
    }
  }

  async loadFormData() {
    const [accounts, categories] = await Promise.all([
      db.getAccounts(),
      db.getCategories()
    ]);

    this.populateAccounts(accounts);
    this.populateCategories(categories);
  }

  populateAccounts(accounts) {
    const accountSelect = document.getElementById('accountId');
    if (!accountSelect) return;

    accountSelect.innerHTML = '<option value="">Select Account</option>';
    
    if (accounts.length === 0) {
      accountSelect.innerHTML += '<option value="" disabled>No accounts found - Add an account first</option>';
      return;
    }

    accounts.forEach(account => {
      const option = document.createElement('option');
      option.value = account.id;
      option.textContent = `${account.name} (${account.type})`;
      accountSelect.appendChild(option);
    });
  }

  populateCategories(categories) {
    const categorySelect = document.getElementById('categoryId');
    if (!categorySelect) return;

    categorySelect.innerHTML = '<option value="">Select Category</option>';
    
    if (categories.length === 0) {
      categorySelect.innerHTML += '<option value="" disabled>No categories found - Add a category first</option>';
      return;
    }

    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = `${category.name} (${category.type})`;
      option.dataset.type = category.type;
      categorySelect.appendChild(option);
    });
  }

  async populateSubcategories(categoryId) {
    const subcategorySelect = document.getElementById('subcategoryId');
    if (!subcategorySelect) return;

    subcategorySelect.innerHTML = '<option value="">Select Subcategory (Optional)</option>';

    if (!categoryId) return;

    try {
      const subcategories = await db.getSubcategories(categoryId);
      
      subcategories.forEach(subcategory => {
        const option = document.createElement('option');
        option.value = subcategory.id;
        option.textContent = subcategory.name;
        subcategorySelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  }

  setupEventListeners() {
    // Transaction type change
    const typeSelect = document.getElementById('transactionType');
    const categorySelect = document.getElementById('categoryId');
    
    if (typeSelect) {
      typeSelect.addEventListener('change', () => {
        this.filterCategoriesByType();
      });
    }

    // Category change
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        this.populateSubcategories(e.target.value);
      });
    }

    // Form submission
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
  }

  filterCategoriesByType() {
    const typeSelect = document.getElementById('transactionType');
    const categorySelect = document.getElementById('categoryId');
    
    if (!typeSelect || !categorySelect) return;

    const selectedType = typeSelect.value;
    const options = categorySelect.querySelectorAll('option');

    options.forEach(option => {
      if (option.value === '') {
        option.style.display = 'block';
        return;
      }

      const optionType = option.dataset.type;
      option.style.display = (selectedType === '' || optionType === selectedType) ? 'block' : 'none';
    });

    // Clear category selection if it doesn't match the new type
    if (selectedType && categorySelect.value) {
      const selectedOption = categorySelect.querySelector(`option[value="${categorySelect.value}"]`);
      if (selectedOption && selectedOption.dataset.type !== selectedType) {
        categorySelect.value = '';
        this.populateSubcategories('');
      }
    }
  }

  setDefaultDate() {
    const dateInput = document.getElementById('transactionDate');
    if (dateInput) {
      dateInput.value = utils.getCurrentDate();
    }
  }

  async handleSubmit() {
    try {
      utils.showLoading();

      const formData = new FormData(this.form);
      const transaction = {
        account_id: formData.get('account_id'),
        type: formData.get('type'),
        category_id: formData.get('category_id'),
        subcategory_id: formData.get('subcategory_id') || null,
        amount: parseFloat(formData.get('amount')),
        description: formData.get('description') || null,
        date: formData.get('date')
      };

      // Validate required fields
      if (!transaction.account_id || !transaction.type || !transaction.category_id || !transaction.amount || !transaction.date) {
        utils.showNotification('Please fill in all required fields.', 'error');
        return;
      }

      if (transaction.amount <= 0) {
        utils.showNotification('Amount must be greater than zero.', 'error');
        return;
      }

      transaction.user_id = await db.getUserId(); // ✅ Attach user_id to transaction

      await db.addTransaction(transaction);
      
      utils.showNotification('Transaction added successfully!', 'success');
      
      // Reset form
      this.resetForm();
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);

    } catch (error) {
      console.error('Error adding transaction:', error);
      utils.showNotification('Error adding transaction. Please try again.', 'error');
    } finally {
      utils.hideLoading();
    }
  }

  resetForm() {
    this.form.reset();
    this.setDefaultDate();
    this.populateSubcategories('');
  }
}

// Initialize add transaction form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new AddTransaction();
});