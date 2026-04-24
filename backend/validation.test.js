/**
 * Validation Tests
 * 
 * Run with: npm install --save-dev jest
 * Then: npx jest validation.test.js
 */

// Validation function (extracted from server.js for testing)
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

// Tests
describe('Expense Validation', () => {
  describe('Amount validation', () => {
    test('rejects negative amounts', () => {
      const result = validateExpense({
        amount: -100,
        category: 'Food',
        description: 'Test',
        date: '2024-04-20'
      });
      expect(result).toContain('Amount must be a positive number');
    });

    test('rejects zero amount', () => {
      const result = validateExpense({
        amount: 0,
        category: 'Food',
        description: 'Test',
        date: '2024-04-20'
      });
      expect(result).toContain('Amount must be a positive number');
    });

    test('rejects non-numeric amount', () => {
      const result = validateExpense({
        amount: 'abc',
        category: 'Food',
        description: 'Test',
        date: '2024-04-20'
      });
      expect(result).toContain('Amount must be a positive number');
    });

    test('accepts valid positive amount', () => {
      const result = validateExpense({
        amount: 100.50,
        category: 'Food',
        description: 'Test',
        date: '2024-04-20'
      });
      expect(result).not.toContain('Amount must be a positive number');
    });
  });

  describe('Category validation', () => {
    test('rejects empty category', () => {
      const result = validateExpense({
        amount: 100,
        category: '',
        description: 'Test',
        date: '2024-04-20'
      });
      expect(result).toContain('Category is required');
    });

    test('accepts valid category', () => {
      const result = validateExpense({
        amount: 100,
        category: 'Food',
        description: 'Test',
        date: '2024-04-20'
      });
      expect(result).not.toContain('Category is required');
    });
  });

  describe('Date validation', () => {
    test('rejects invalid date format', () => {
      const result = validateExpense({
        amount: 100,
        category: 'Food',
        description: 'Test',
        date: '20-04-2024'
      });
      expect(result).toContain('Valid date is required (YYYY-MM-DD)');
    });

    test('accepts valid YYYY-MM-DD format', () => {
      const result = validateExpense({
        amount: 100,
        category: 'Food',
        description: 'Test',
        date: '2024-04-20'
      });
      expect(result).not.toContain('Valid date is required (YYYY-MM-DD)');
    });

    test('rejects invalid dates', () => {
      const result = validateExpense({
        amount: 100,
        category: 'Food',
        description: 'Test',
        date: '2024-13-45'
      });
      expect(result).toContain('Valid date is required (YYYY-MM-DD)');
    });
  });

  describe('Complete expense validation', () => {
    test('accepts valid expense', () => {
      const result = validateExpense({
        amount: 150.75,
        category: 'Entertainment',
        description: 'Movie tickets',
        date: '2024-04-20'
      });
      expect(result.length).toBe(0);
    });

    test('rejects expense with multiple errors', () => {
      const result = validateExpense({
        amount: -100,
        category: '',
        description: '',
        date: 'invalid'
      });
      expect(result.length).toBe(4);
    });
  });
});