import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { createExpense, fetchExpenses, fetchCategories } from './api/expenseService';

const CATEGORY_META = {
  Food:          { icon: '🍜', color: '#f97316' },
  Transport:     { icon: '🚇', color: '#3b82f6' },
  Entertainment: { icon: '🎬', color: '#a855f7' },
  Utilities:     { icon: '⚡', color: '#eab308' },
  Shopping:      { icon: '🛍️', color: '#ec4899' },
  Health:        { icon: '💊', color: '#10b981' },
  Other:         { icon: '📦', color: '#6b7280' },
};

const getCatMeta = (cat) => CATEGORY_META[cat] || { icon: '📌', color: '#6b7280' };

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card" style={{ '--accent': accent }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function CategoryPill({ cat, selected, onClick }) {
  const meta = getCatMeta(cat);
  return (
    <button
      className={`cat-pill ${selected ? 'cat-pill--active' : ''}`}
      style={{ '--c': meta.color }}
      onClick={() => onClick(cat)}
    >
      <span className="cat-pill-icon">{meta.icon}</span>
      {cat}
    </button>
  );
}

function ExpenseRow({ expense, index }) {
  const meta = getCatMeta(expense.category);
  const date = new Date(expense.date);
  const isToday = new Date().toDateString() === date.toDateString();
  const dateLabel = isToday
    ? 'Today'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div
      className="expense-row"
      style={{ '--delay': `${index * 40}ms`, '--accent': meta.color }}
    >
      <div className="expense-row-icon" style={{ background: meta.color + '18', color: meta.color }}>
        {meta.icon}
      </div>
      <div className="expense-row-info">
        <span className="expense-row-desc">{expense.description}</span>
        <span className="expense-row-cat">{expense.category}</span>
      </div>
      <div className="expense-row-right">
        <span className="expense-row-amount">₹{parseFloat(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span className="expense-row-date">{dateLabel}</span>
      </div>
    </div>
  );
}

function SpendBar({ expenses }) {
  const byCat = {};
  let total = 0;
  expenses.forEach(e => {
    const amt = parseFloat(e.amount || 0);
    byCat[e.category] = (byCat[e.category] || 0) + amt;
    total += amt;
  });

  if (total === 0) return null;

  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  return (
    <div className="spend-bar-wrap">
      <div className="spend-bar">
        {sorted.map(([cat, amt]) => {
          const meta = getCatMeta(cat);
          const pct = (amt / total) * 100;
          return (
            <div
              key={cat}
              className="spend-bar-seg"
              style={{ width: `${pct}%`, background: meta.color }}
              title={`${cat}: ₹${amt.toFixed(0)} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <div className="spend-legend">
        {sorted.map(([cat, amt]) => {
          const meta = getCatMeta(cat);
          const pct = (amt / total) * 100;
          return (
            <div key={cat} className="spend-legend-item">
              <span className="spend-legend-dot" style={{ background: meta.color }} />
              <span className="spend-legend-cat">{cat}</span>
              <span className="spend-legend-pct">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(Object.keys(CATEGORY_META));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortDate, setSortDate] = useState('desc');
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const tempIdRef = useRef(null);

  useEffect(() => { loadExpenses(); }, [filterCategory, sortDate]);
  useEffect(() => {
    fetchCategories()
      .then(d => d?.length && setCategories(d))
      .catch(() => {});
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchExpenses({ category: filterCategory, sortDate });
      setExpenses(data);
    } catch {
      setError('Could not load expenses. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, sortDate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const errs = [];
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) errs.push('Amount must be a positive number');
    if (!formData.category) errs.push('Please select a category');
    if (!formData.description.trim()) errs.push('Description is required');
    if (!formData.date) errs.push('Date is required');
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const errs = validateForm();
    if (errs.length) { setError(errs[0]); return; }

    setSubmitting(true);
    const tempId = `temp-${Date.now()}`;
    tempIdRef.current = tempId;

    const optimistic = {
      id: tempId,
      amount: formData.amount,
      category: formData.category,
      description: formData.description,
      date: formData.date,
      _pending: true,
    };
    setExpenses(prev => [optimistic, ...prev]);

    try {
      const created = await createExpense({
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: formData.date,
      });
      setExpenses(prev => prev.map(e => e.id === tempId ? { ...created } : e));
      setFormData({ amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] });
      setSuccessMessage('Expense recorded!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowForm(false);
      loadExpenses();
    } catch {
      setError('Failed to save expense. Please try again.');
      setExpenses(prev => prev.filter(e => e.id !== tempId));
    } finally {
      setSubmitting(false);
    }
  };

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const avgPerEntry = expenses.length ? total / expenses.length : 0;

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">₹</div>
          <div>
            <div className="brand-name">Kharch</div>
            <div className="brand-tagline">expense tracker</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'list' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('list')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg>
            Expenses
          </button>
          <button className={`nav-item ${activeTab === 'analytics' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Analytics
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-total-label">Total tracked</div>
          <div className="sidebar-total-val">₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">
              {activeTab === 'list' ? 'My Expenses' : 'Analytics'}
            </h1>
            <span className="expense-count">{expenses.length} entries</span>
          </div>
          <button className="add-btn" onClick={() => setShowForm(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Expense
          </button>
        </header>

        {activeTab === 'list' && (
          <>
            {/* Stats row */}
            <div className="stats-row">
              <StatCard label="Total shown" value={`₹${total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} sub={`${expenses.length} entries`} accent="#6366f1" />
              <StatCard label="This month" value={`₹${thisMonth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} accent="#10b981" />
              <StatCard label="Avg per entry" value={`₹${avgPerEntry.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} accent="#f59e0b" />
            </div>

            {/* Filters */}
            <div className="filters-row">
              <div className="cat-pills">
                <button
                  className={`cat-pill ${!filterCategory ? 'cat-pill--active cat-pill--all' : ''}`}
                  onClick={() => setFilterCategory('')}
                >All</button>
                {categories.map(c => (
                  <CategoryPill key={c} cat={c} selected={filterCategory === c} onClick={setFilterCategory} />
                ))}
              </div>
              <div className="sort-control">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
                <select value={sortDate} onChange={e => setSortDate(e.target.value)} className="sort-select">
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="list-section">
              {error && <div className="alert alert--error">{error}</div>}
              {loading ? (
                <div className="loading-state">
                  {[1,2,3].map(i => <div key={i} className="skeleton-row" />)}
                </div>
              ) : expenses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🧾</div>
                  <div className="empty-title">No expenses yet</div>
                  <div className="empty-sub">Click "Add Expense" to record your first one</div>
                </div>
              ) : (
                <div className="expense-list">
                  {expenses.map((exp, i) => <ExpenseRow key={exp.id} expense={exp} index={i} />)}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-section">
            <div className="analytics-grid">
              <div className="analytics-card">
                <div className="analytics-card-title">Spending breakdown</div>
                <SpendBar expenses={expenses} />
              </div>
              <div className="analytics-card">
                <div className="analytics-card-title">By category</div>
                {(() => {
                  const byCat = {};
                  expenses.forEach(e => {
                    const amt = parseFloat(e.amount || 0);
                    byCat[e.category] = (byCat[e.category] || 0) + amt;
                  });
                  const sorted = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
                  const max = sorted[0]?.[1] || 1;
                  return sorted.length === 0
                    ? <div className="empty-sub" style={{padding:'2rem 0'}}>No data yet</div>
                    : sorted.map(([cat, amt]) => {
                        const meta = getCatMeta(cat);
                        return (
                          <div key={cat} className="cat-bar-row">
                            <div className="cat-bar-label">
                              <span style={{marginRight:6}}>{meta.icon}</span>{cat}
                            </div>
                            <div className="cat-bar-track">
                              <div className="cat-bar-fill" style={{ width: `${(amt/max)*100}%`, background: meta.color }} />
                            </div>
                            <div className="cat-bar-amount">₹{amt.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
                          </div>
                        );
                      });
                })()}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Expense Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Add expense</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {error && <div className="alert alert--error">{error}</div>}
            {successMessage && <div className="alert alert--success">{successMessage}</div>}

            <form onSubmit={handleSubmit} className="expense-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <div className="input-wrap input-wrap--prefix">
                    <span className="input-prefix">₹</span>
                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={handleInputChange}
                      disabled={submitting}
                      className="form-input form-input--prefixed"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    disabled={submitting}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <div className="cat-select-grid">
                  {categories.map(cat => {
                    const meta = getCatMeta(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`cat-select-item ${formData.category === cat ? 'cat-select-item--active' : ''}`}
                        style={{ '--c': meta.color }}
                        onClick={() => setFormData(p => ({ ...p, category: cat }))}
                        disabled={submitting}
                      >
                        <span className="cat-select-icon">{meta.icon}</span>
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  name="description"
                  placeholder="What did you spend on?"
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={submitting}
                  className="form-input"
                  required
                />
              </div>

              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (
                  <><span className="spinner" /> Saving…</>
                ) : (
                  'Save expense'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}