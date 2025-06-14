import { db, utils } from './supabase.js';

class CategoriesManager {
  constructor() {
    this.categoryForm = document.getElementById('categoryForm');
    this.accountForm = document.getElementById('accountForm');
    this.subcategoryForm = document.getElementById('subcategoryForm');
    this.currentFilter = 'all';
    this.init();
  }

  async init() {
    try {
      utils.showLoading();
      await this.loadData();
      this.setupEventListeners();
    } catch (error) {
      console.error('Error initializing categories manager:', error);
      utils.showNotification('Error loading data. Please check your Supabase configuration.', 'error');
    } finally {
      utils.hideLoading();
    }
  }

  async loadData() {
    const [categories, subcategories, accounts] = await Promise.all([
      db.getCategories(),
      db.getSubcategories(),
      db.getAccounts()
    ]);

    this.categories = categories;
    this.subcategories = subcategories;
    this.accounts = accounts;

    this.renderCategories();
    this.renderAccounts();
  }

  setupEventListeners() {
    // Category form submission
    if (this.categoryForm) {
      this.categoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCategorySubmit();
      });
    }

    // Account form submission
    if (this.accountForm) {
      this.accountForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAccountSubmit();
      });
    }

    // Subcategory form submission
    if (this.subcategoryForm) {
      this.subcategoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubcategorySubmit();
      });
    }

    // Tab filtering
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        this.handleTabClick(e.target.dataset.type);
      });
    });

    // Modal close functionality
    const modal = document.getElementById('subcategoryModal');
    const closeBtn = modal?.querySelector('.close');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    if (modal) {
      window.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }
  }

  async handleCategorySubmit() {
    try {
      utils.showLoading();

      const formData = new FormData(this.categoryForm);
      const category = {
        name: formData.get('name').trim(),
        type: formData.get('type')
      };

      if (!category.name || !category.type) {
        utils.showNotification('Please fill in all fields.', 'error');
        return;
      }

      // Check if category already exists
      const existingCategory = this.categories.find(cat => 
        cat.name.toLowerCase() === category.name.toLowerCase() && cat.type === category.type
      );

      if (existingCategory) {
        utils.showNotification('A category with this name and type already exists.', 'error');
        return;
      }

      await db.addCategory(category);
      
      utils.showNotification('Category added successfully!', 'success');
      this.categoryForm.reset();
      await this.loadData();

    } catch (error) {
      console.error('Error adding category:', error);
      utils.showNotification('Error adding category. Please try again.', 'error');
    } finally {
      utils.hideLoading();
    }
  }

  async handleAccountSubmit() {
    try {
      utils.showLoading();

      const formData = new FormData(this.accountForm);
      const account = {
        name: formData.get('name').trim(),
        type: formData.get('type'),
        bank_name: formData.get('bank_name').trim() || null
      };

      if (!account.name || !account.type) {
        utils.showNotification('Please fill in required fields.', 'error');
        return;
      }

      // Check if account already exists
      const existingAccount = this.accounts.find(acc => 
        acc.name.toLowerCase() === account.name.toLowerCase()
      );

      if (existingAccount) {
        utils.showNotification('An account with this name already exists.', 'error');
        return;
      }

      await db.addAccount(account);
      
      utils.showNotification('Account added successfully!', 'success');
      this.accountForm.reset();
      await this.loadData();

    } catch (error) {
      console.error('Error adding account:', error);
      utils.showNotification('Error adding account. Please try again.', 'error');
    } finally {
      utils.hideLoading();
    }
  }

  async handleSubcategorySubmit() {
    try {
      utils.showLoading();

      const formData = new FormData(this.subcategoryForm);
      const subcategory = {
        category_id: formData.get('category_id'),
        name: formData.get('name').trim()
      };

      if (!subcategory.name || !subcategory.category_id) {
        utils.showNotification('Please fill in all fields.', 'error');
        return;
      }

      // Check if subcategory already exists for this category
      const existingSubcategory = this.subcategories.find(sub => 
        sub.category_id === subcategory.category_id && 
        sub.name.toLowerCase() === subcategory.name.toLowerCase()
      );

      if (existingSubcategory) {
        utils.showNotification('A subcategory with this name already exists for this category.', 'error');
        return;
      }

      await db.addSubcategory(subcategory);
      
      utils.showNotification('Subcategory added successfully!', 'success');
      this.subcategoryForm.reset();
      this.closeModal();
      await this.loadData();

    } catch (error) {
      console.error('Error adding subcategory:', error);
      utils.showNotification('Error adding subcategory. Please try again.', 'error');
    } finally {
      utils.hideLoading();
    }
  }

  handleTabClick(type) {
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');

    this.currentFilter = type;
    this.renderCategories();
  }

  renderCategories() {
    const categoriesGrid = document.getElementById('categoriesGrid');
    if (!categoriesGrid) return;

    let filteredCategories = this.categories;
    if (this.currentFilter !== 'all') {
      filteredCategories = this.categories.filter(cat => cat.type === this.currentFilter);
    }

    if (filteredCategories.length === 0) {
      categoriesGrid.innerHTML = `
        <div class="empty-state">
          <p>No categories found for the selected filter.</p>
        </div>
      `;
      return;
    }

    categoriesGrid.innerHTML = filteredCategories.map(category => {
      const categorySubcategories = this.subcategories.filter(sub => sub.category_id === category.id);
      
      return `
        <div class="category-card">
          <div class="category-header">
            <div class="category-name">${category.name}</div>
            <div class="category-type-badge ${category.type}">${category.type}</div>
          </div>
          
          ${categorySubcategories.length > 0 ? `
            <div class="subcategories-list">
              <h4>Subcategories</h4>
              ${categorySubcategories.map(sub => `
                <span class="subcategory-item">${sub.name}</span>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="category-actions">
            <button class="btn btn-small btn-primary" onclick="window.categoriesManager.openSubcategoryModal('${category.id}')">
              Add Subcategory
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderAccounts() {
    const accountsList = document.getElementById('accountsList');
    if (!accountsList) return;

    if (this.accounts.length === 0) {
      accountsList.innerHTML = `
        <div class="empty-state">
          <p>No accounts found.</p>
        </div>
      `;
      return;
    }

    accountsList.innerHTML = this.accounts.map(account => `
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

  openSubcategoryModal(categoryId) {
    const modal = document.getElementById('subcategoryModal');
    const parentCategoryInput = document.getElementById('parentCategoryId');
    
    if (modal && parentCategoryInput) {
      parentCategoryInput.value = categoryId;
      modal.style.display = 'block';
    }
  }

  closeModal() {
    const modal = document.getElementById('subcategoryModal');
    if (modal) {
      modal.style.display = 'none';
      this.subcategoryForm.reset();
    }
  }
}

// Global function for modal operations
window.openSubcategoryModal = (categoryId) => {
  if (window.categoriesManager) {
    window.categoriesManager.openSubcategoryModal(categoryId);
  }
};

window.closeModal = () => {
  if (window.categoriesManager) {
    window.categoriesManager.closeModal();
  }
};

// Initialize categories manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.categoriesManager = new CategoriesManager();
});