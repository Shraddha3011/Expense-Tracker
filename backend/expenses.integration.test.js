const request = require('supertest');
const { app, db } = require('./server');

function runSql(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

describe('Expense API integration', () => {
  beforeEach(async () => {
    await runSql('DELETE FROM idempotency_keys');
    await runSql('DELETE FROM expenses');
  });

  afterAll(async () => {
    await runSql('DELETE FROM idempotency_keys');
    await runSql('DELETE FROM expenses');
    await new Promise((resolve) => db.close(resolve));
  });

  test('creates a new expense and returns createdAt', async () => {
    const response = await request(app)
      .post('/expenses')
      .set('idempotency-key', 'create-expense-1')
      .send({
        amount: 150.25,
        category: 'Food',
        description: 'Lunch',
        date: '2026-04-24',
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        amount: '150.25',
        category: 'Food',
        description: 'Lunch',
        date: '2026-04-24',
      })
    );
    expect(response.body.createdAt).toBeTruthy();
  });

  test('returns same expense for repeated request with same idempotency key', async () => {
    const payload = {
      amount: 500,
      category: 'Shopping',
      description: 'Shoes',
      date: '2026-04-23',
    };

    const first = await request(app)
      .post('/expenses')
      .set('idempotency-key', 'dup-key')
      .send(payload);

    const second = await request(app)
      .post('/expenses')
      .set('idempotency-key', 'dup-key')
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);

    const all = await request(app).get('/expenses');
    expect(all.status).toBe(200);
    expect(all.body).toHaveLength(1);
  });

  test('filters by category and sorts newest first by default', async () => {
    const expenses = [
      {
        key: 'cat-1',
        amount: 100,
        category: 'Food',
        description: 'Breakfast',
        date: '2026-04-20',
      },
      {
        key: 'cat-2',
        amount: 200,
        category: 'Transport',
        description: 'Taxi',
        date: '2026-04-21',
      },
      {
        key: 'cat-3',
        amount: 300,
        category: 'Food',
        description: 'Dinner',
        date: '2026-04-22',
      },
    ];

    for (const expense of expenses) {
      await request(app)
        .post('/expenses')
        .set('idempotency-key', expense.key)
        .send(expense);
    }

    const filtered = await request(app).get('/expenses').query({ category: 'Food' });

    expect(filtered.status).toBe(200);
    expect(filtered.body).toHaveLength(2);
    expect(filtered.body[0].date).toBe('2026-04-22');
    expect(filtered.body[1].date).toBe('2026-04-20');
    expect(filtered.body.every((item) => item.category === 'Food')).toBe(true);
  });
});
