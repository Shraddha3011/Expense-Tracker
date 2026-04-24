import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { createExpense, fetchCategories, fetchExpenses } from './api/expenseService';

jest.mock('./api/expenseService', () => ({
  createExpense: jest.fn(),
  fetchExpenses: jest.fn(),
  fetchCategories: jest.fn(),
}));

describe('App expense flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchCategories.mockResolvedValue(['Food', 'Transport']);
  });

  test('shows total based on loaded expense list', async () => {
    fetchExpenses.mockResolvedValue([
      { id: '1', amount: '100.00', category: 'Food', description: 'Lunch', date: '2026-04-24' },
      { id: '2', amount: '50.00', category: 'Transport', description: 'Cab', date: '2026-04-23' },
    ]);

    render(<App />);

    expect(await screen.findByText('Lunch')).toBeInTheDocument();
    expect(screen.getAllByText('₹150')).not.toHaveLength(0);
  });

  test('loads with selected category filter', async () => {
    fetchExpenses.mockResolvedValue([]);
    render(<App />);

    const foodPill = await screen.findByRole('button', { name: /food/i });
    await userEvent.click(foodPill);

    await waitFor(() => {
      expect(fetchExpenses).toHaveBeenLastCalledWith({ category: 'Food', sortDate: 'desc' });
    });
  });

  test('submits form and creates an expense', async () => {
    fetchExpenses.mockResolvedValue([]);
    createExpense.mockResolvedValue({
      id: 'expense-1',
      amount: '120.00',
      category: 'Food',
      description: 'Dinner',
      date: '2026-04-24',
      createdAt: '2026-04-24 12:00:00',
    });

    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: /add expense/i }));
    const dialog = await screen.findByRole('dialog', { name: /add expense/i });
    await userEvent.type(screen.getByLabelText(/amount/i), '120');
    await userEvent.click(within(dialog).getByRole('button', { name: /food/i }));
    await userEvent.type(screen.getByLabelText(/description/i), 'Dinner');
    await userEvent.click(within(dialog).getByRole('button', { name: /save expense/i }));

    await waitFor(() => {
      expect(createExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 120,
          category: 'Food',
          description: 'Dinner',
        })
      );
    });
  });

  test('shows error message when expense loading fails', async () => {
    fetchExpenses.mockRejectedValue(new Error('network'));
    render(<App />);

    expect(await screen.findByText(/could not load expenses/i)).toBeInTheDocument();
  });
});
