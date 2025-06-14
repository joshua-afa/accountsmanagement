// Supabase configuration and client setup
// Using environment variables from .env file

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Import Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get current user ID (helper function)
export async function getUserId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.error('Unable to get current user:', error);
    throw new Error('User not logged in');
  }
  return user.id;
}


// Utility functions for database operations
export const db = {
  // Accounts operations
  async getAccounts() {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user_id)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
  return data;
},


  async addAccount(account) {
  const user_id = await getUserId(); // ✅ Add this line

  const { data, error } = await supabase
    .from('accounts')
    .insert([{
      user_id, // ✅ Attach user to new account
      name: account.name,
      type: account.type,
      bank_name: account.bank_name || null,
      account_number: account.account_number || null,
      balance: account.balance || 0,
      is_active: true
    }])
    .select();

  if (error) {
    console.error('Error adding account:', error);
    throw error;
  }
  return data[0];
},


  async updateAccountBalance(accountId, newBalance) {
  const user_id = await getUserId(); // ✅ Add this line

  const { data, error } = await supabase
    .from('accounts')
    .update({ balance: newBalance })
    .eq('id', accountId)
    .eq('user_id', user_id) // ✅ Ensure the account belongs to the logged-in user
    .select();

  if (error) {
    console.error('Error updating account balance:', error);
    throw error;
  }
  return data[0];
},

  // Categories operations
  async getCategories(type = null) {
    let query = supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
    return data;
  },

  async addCategory(category) {
  const user_id = await getUserId(); // ✅ Add this line

  const { data, error } = await supabase
    .from('categories')
    .insert([{
      name: category.name,
      type: category.type,
      user_id: user_id // ✅ Store which user owns this category
    }])
    .select();

  if (error) {
    console.error('Error adding category:', error);
    throw error;
  }
  return data[0];
},

  // Subcategories operations
  async getCategories(type = null) {
  const user_id = await getUserId(); // ✅ Add this line

  let query = supabase
    .from('categories')
    .select('*')
    .eq('user_id', user_id) // ✅ Ensure categories belong to logged-in user
    .order('name');

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
  return data;
},

  async addSubcategory(subcategory) {
  const user_id = await getUserId(); // ✅ Add this line

  const { data, error } = await supabase
    .from('subcategories')
    .insert([{
      category_id: subcategory.category_id,
      name: subcategory.name,
      user_id: user_id // ✅ Associate subcategory with the logged-in user
    }])
    .select();

  if (error) {
    console.error('Error adding subcategory:', error);
    throw error;
  }
  return data[0];
},

  async getSubcategories(categoryId = null) {
  const user_id = await getUserId(); // ✅ Add this line

  let query = supabase
    .from('subcategories')
    .select('*')
    .eq('user_id', user_id) // ✅ Ensure only that user's subcategories are shown
    .order('name');

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching subcategories:', error);
    throw error;
  }
  return data;
},


  // Transactions operations
  async getTransactions(filters = {}) {
  const user_id = await getUserId(); // ✅ Add this line

  let query = supabase
    .from('transactions')
    .select(`
      *,
      accounts (name, type),
      categories (name, type),
      subcategories (name)
    `)
    .eq('user_id', user_id) // ✅ Filter by user_id
    .order('date', { ascending: false });

  // Apply filters
  if (filters.account_id) {
    query = query.eq('account_id', filters.account_id);
  }
  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters.date_from) {
    query = query.gte('date', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('date', filters.date_to);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
  return data;
},

  async addTransaction(transaction) {
  const user_id = await getUserId(); // ✅ Add this line

  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      user_id: user_id, // ✅ Associate transaction with user
      account_id: transaction.account_id,
      type: transaction.type,
      category_id: transaction.category_id,
      subcategory_id: transaction.subcategory_id || null,
      amount: transaction.amount,
      description: transaction.description || null,
      date: transaction.date
    }])
    .select();

  if (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
  return data[0];
  },

  async updateTransaction(transactionId, transaction) {
  const user_id = await getUserId(); // ✅ Get current user

  const { data, error } = await supabase
    .from('transactions')
    .update({
      account_id: transaction.account_id,
      type: transaction.type,
      category_id: transaction.category_id,
      subcategory_id: transaction.subcategory_id || null,
      amount: transaction.amount,
      description: transaction.description || null,
      date: transaction.date
    })
    .eq('id', transactionId)
    .eq('user_id', user_id) // ✅ Ensure only user's transaction is updated
    .select();

  if (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
  return data[0];
},

  async deleteTransaction(transactionId) {
  const user_id = await getUserId(); // ✅ Ensure correct user

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', user_id); // ✅ Restrict deletion to user’s own data

  if (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
  return true;
},

  // Analytics and summaries
  async getMonthlyTotals(year, month) {
  const user_id = await getUserId(); // ✅ Add user filter
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', user_id) // ✅ Only fetch user’s data
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('Error fetching monthly totals:', error);
    throw error;
  }

  const totals = data.reduce((acc, transaction) => {
    if (transaction.type === 'income') {
      acc.income += parseFloat(transaction.amount);
    } else {
      acc.expense += parseFloat(transaction.amount);
    }
    return acc;
  }, { income: 0, expense: 0 });

  return totals;
},

  async getCategoryBreakdown(year, month, type = 'expense') {
  const user_id = await getUserId(); // ✅ Restrict by user
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      amount,
      categories (name)
    `)
    .eq('type', type)
    .eq('user_id', user_id) // ✅ Filter by user
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('Error fetching category breakdown:', error);
    throw error;
  }

  const breakdown = data.reduce((acc, transaction) => {
    const categoryName = transaction.categories?.name || 'Uncategorized';
    acc[categoryName] = (acc[categoryName] || 0) + parseFloat(transaction.amount);
    return acc;
  }, {});

  return Object.entries(breakdown)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
},

async getTotalBalance() {
  const user_id = await getUserId(); // ✅ Add user filter

  const { data, error } = await supabase
    .from('accounts')
    .select('balance')
    .eq('is_active', true)
    .eq('user_id', user_id); // ✅ Restrict to current user’s accounts

  if (error) {
    console.error('Error fetching total balance:', error);
    throw error;
  }

  return data.reduce((total, account) => total + parseFloat(account.balance || 0), 0);
};

// Utility functions
export const utils = {
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  },

  formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  },

  getCurrentMonth() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };
  },

  showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'flex';
  },

  hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'none';
  },

  showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');

    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  },

  exportToCSV(data, filename) {
    const csvContent = this.convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
};

// Export the Supabase client for direct access if needed
export { supabase };