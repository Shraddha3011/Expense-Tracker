const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database setup
const db = new sqlite3.Database('./expenses.db', (err) => {
  if (err) console.error('Database error:', err);
  else console.log('Connected to SQLite database');
});

// Initialize database tables
db.serialize(() => {
  // Main expenses table
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Idempotency store (prevent duplicate inserts on retry)
  db.run(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      idempotency_key TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (expense_id) REFERENCES expenses(id)
    )
  `);
});

// Helper: Validate expense data
function validateExpense(body) {
  const errors = [];
  
  if (!body.amount || isNaN(body.amount) || body.amount <= 0) {
    errors.push('Amount must be a positive number');
  }
  
  if (!body.category || body.category.trim() === '') {
    errors.push('Category is required');
  }
  
  if (!body.description || body.description.trim() === '') {
    errors.push('Description is required');
  }
  
  if (!body.date || !isValidDate(body.date)) {
    errors.push('Valid date is required (YYYY-MM-DD)');
  }
  
  return errors;
}

function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// POST /expenses - Create a new expense with idempotency
app.post('/expenses', (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  
  // Validate idempotency key
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return res.status(400).json({ error: 'idempotency-key header is required' });
  }

  // Validate expense data
  const validationErrors = validateExpense(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ errors: validationErrors });
  }

  // Check if this idempotency key already exists
  db.get(
    'SELECT expense_id FROM idempotency_keys WHERE idempotency_key = ?',
    [idempotencyKey],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // If key exists, return the cached response
      if (row) {
        db.get('SELECT * FROM expenses WHERE id = ?', [row.expense_id], (err, expense) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          return res.status(201).json(formatExpense(expense));
        });
        return;
      }

      // Create new expense
      const expenseId = uuidv4();
      const amountInCents = Math.round(parseFloat(req.body.amount) * 100); // Store as cents
      const { category, description, date } = req.body;

      db.run(
        `INSERT INTO expenses (id, amount, category, description, date) 
         VALUES (?, ?, ?, ?, ?)`,
        [expenseId, amountInCents, category, description, date],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create expense' });
          }

          // Store idempotency key
          db.run(
            'INSERT INTO idempotency_keys (idempotency_key, expense_id) VALUES (?, ?)',
            [idempotencyKey, expenseId],
            (err) => {
              if (err) console.error('Idempotency key storage error:', err);
            }
          );

          // Return the created expense
          db.get('SELECT * FROM expenses WHERE id = ?', [expenseId], (err, expense) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.status(201).json(formatExpense(expense));
          });
        }
      );
    }
  );
});

// GET /expenses - List expenses with filtering and sorting
app.get('/expenses', (req, res) => {
  const { category, sortDate } = req.query;

  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];

  // Filter by category
  if (category && category.trim() !== '') {
    query += ' AND category = ?';
    params.push(category);
  }

  // Sort by date (default: newest first)
  if (sortDate === 'asc') {
    query += ' ORDER BY date ASC';
  } else {
    query += ' ORDER BY date DESC';
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const expenses = rows.map(formatExpense);
    res.json(expenses);
  });
});

// GET /expenses/:id - Get a single expense
app.get('/expenses/:id', (req, res) => {
  db.get('SELECT * FROM expenses WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(formatExpense(row));
  });
});

// Helper: Format expense for API response (convert cents back to dollars)
function formatExpense(expense) {
  return {
    id: expense.id,
    amount: (expense.amount / 100).toFixed(2),
    category: expense.category,
    description: expense.description,
    date: expense.date,
    created_at: expense.created_at,
  };
}

// GET /expenses/categories/list - Get unique categories
app.get('/categories/list', (req, res) => {
  db.all(
    'SELECT DISTINCT category FROM expenses ORDER BY category ASC',
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      const categories = rows.map(r => r.category);
      res.json(categories);
    }
  );
});

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Expense Tracker API is working 🚀',
  });
});
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});