import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { createExpense, fetchExpenses, fetchCategories } from './api/expenseService';

function App() {
  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // UI State
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Filter & Sort state
  const [filterCategory, setFilterCategory] = useState('');
  const [sortDate, setSortDate] = useState('desc');

  // Load expenses and categories on mount and when filters change
  useEffect(() => {
    loadExpenses();
    loadCategories();
  }, [filterCategory, sortDate]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchExpenses({ category: filterCategory, sortDate });
      setExpenses(data);
    } catch (err) {
      setError('Failed to load expenses. Please refresh the page.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, sortDate]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Validate form
  const validateForm = () => {
    const errors = [];

    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      errors.push('Amount must be positive');
    }

    if (!formData.category.trim()) {
      errors.push('Category is required');
    }

    if (!formData.description.trim()) {
      errors.push('Description is required');
    }

    if (!formData.date) {
      errors.push('Date is required');
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validate
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setSubmitting(true);

    try {
      // Optimistic update
      const newExpense = {
        id: `temp-${Date.now()}`,
        amount: formData.amount,
        category: formData.category,
        description: formData.description,
        date: formData.date,
      };

      setExpenses(prev => [newExpense, ...prev]);

      // Submit to API
      const createdExpense = await createExpense({
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: formData.date,
      });

      // Replace temp expense with real one
      setExpenses(prev =>
        prev.map(exp => (exp.id === newExpense.id ? createdExpense : exp))
      );

      // Reset form
      setFormData({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });

      setSuccessMessage('✅ Expense added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reload to ensure consistency
      loadExpenses();
    } catch (err) {
      setError('Failed to add expense. Please try again.');
      // Remove optimistic update on error
      setExpenses(prev => prev.filter(exp => exp.id !== `temp-${Date.now()}`));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate total
  const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

  return (
    <div className="app-container">
      <header className="header">
        <h1>💰 Expense Tracker</h1>
        <p className="subtitle">Track your spending, understand your habits</p>
      </header>

      <main className="main-content">
        {/* Form Section */}
        <section className="form-section">
          <h2>Add New Expense</h2>
          {error && <div className="alert alert-error">{error}</div>}
          {successMessage && <div className="alert alert-success">{successMessage}</div>}

          <form onSubmit={handleSubmit} className="expense-form">
            <div className="form-group">
              <label htmlFor="amount">Amount (₹)</label>
              <input
                id="amount"
                type="number"
                name="amount"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleInputChange}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                disabled={submitting}
                required
              >
                <option value="">Select Category</option>
                {categories.length > 0 ? (
                  categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))
                ) : (
                  <>
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Other">Other</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <input
                id="description"
                type="text"
                name="description"
                placeholder="What did you spend on?"
                value={formData.description}
                onChange={handleInputChange}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                disabled={submitting}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Adding...' : 'Add Expense'}
            </button>
          </form>
        </section>

        {/* Filter & Sort Section */}
        <section className="controls-section">
          <h2>Your Expenses</h2>
          <div className="controls">
            <div className="control-group">
              <label htmlFor="filter-category">Filter by Category</label>
              <select
                id="filter-category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label htmlFor="sort-date">Sort by Date</label>
              <select
                id="sort-date"
                value={sortDate}
                onChange={(e) => setSortDate(e.target.value)}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </section>

        {/* Expenses List */}
        <section className="expenses-section">
          {loading ? (
            <div className="loading">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="empty-state">
              <p>No expenses yet. Add one to get started! 👆</p>
            </div>
          ) : (
            <>
              <div className="expenses-list">
                <div className="list-header">
                  <div className="col-date">Date</div>
                  <div className="col-category">Category</div>
                  <div className="col-description">Description</div>
                  <div className="col-amount">Amount</div>
                </div>

                {expenses.map(expense => (
                  <div key={expense.id} className="expense-item">
                    <div className="col-date">{new Date(expense.date).toLocaleDateString()}</div>
                    <div className="col-category">
                      <span className="category-badge">{expense.category}</span>
                    </div>
                    <div className="col-description">{expense.description}</div>
                    <div className="col-amount">₹{parseFloat(expense.amount).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <div className="total-section">
                <h3>Total: ₹{total.toFixed(2)}</h3>
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>Built for managing your finances efficiently</p>
      </footer>
    </div>
  );
}

export default App;