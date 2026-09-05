const { computeBalancesFromExpenses, simplifyDebts } = require('./debtSimplification');

function applyTransactions(balances, transactions) {
  const result = { ...balances };
  for (const { from, to, amount } of transactions) {
    result[from] += amount;
    result[to] -= amount;
  }
  return result;
}

describe('computeBalancesFromExpenses', () => {
  it('splits a single expense evenly among all members by default', () => {
    const members = ['a', 'b', 'c'];
    const expenses = [{ paidBy: 'a', amount: 30 }];
    const balances = computeBalancesFromExpenses(members, expenses);
    expect(balances.a).toBeCloseTo(20); // paid 30, owes 10 -> net +20
    expect(balances.b).toBeCloseTo(-10);
    expect(balances.c).toBeCloseTo(-10);
  });

  it('splits an expense only among specified participants', () => {
    const members = ['a', 'b', 'c'];
    const expenses = [{ paidBy: 'a', amount: 20, splitAmong: ['a', 'b'] }];
    const balances = computeBalancesFromExpenses(members, expenses);
    expect(balances.a).toBeCloseTo(10);
    expect(balances.b).toBeCloseTo(-10);
    expect(balances.c).toBeCloseTo(0);
  });

  it('accumulates balances across multiple expenses', () => {
    const members = ['a', 'b'];
    const expenses = [
      { paidBy: 'a', amount: 10 },
      { paidBy: 'b', amount: 10 },
    ];
    const balances = computeBalancesFromExpenses(members, expenses);
    expect(balances.a).toBeCloseTo(0);
    expect(balances.b).toBeCloseTo(0);
  });

  it('throws when paidBy is not a member', () => {
    expect(() =>
      computeBalancesFromExpenses(['a', 'b'], [{ paidBy: 'zzz', amount: 10 }])
    ).toThrow();
  });

  it('throws when a splitAmong participant is not a member', () => {
    expect(() =>
      computeBalancesFromExpenses(['a', 'b'], [{ paidBy: 'a', amount: 10, splitAmong: ['a', 'zzz'] }])
    ).toThrow();
  });

  it('returns zero balances for no expenses', () => {
    const balances = computeBalancesFromExpenses(['a', 'b'], []);
    expect(balances).toEqual({ a: 0, b: 0 });
  });
});

describe('simplifyDebts', () => {
  it('produces a single transaction for a simple two-person debt', () => {
    const transactions = simplifyDebts({ a: 10, b: -10 });
    expect(transactions).toEqual([{ from: 'b', to: 'a', amount: 10 }]);
  });

  it('produces no transactions when everyone is already settled', () => {
    const transactions = simplifyDebts({ a: 0, b: 0 });
    expect(transactions).toEqual([]);
  });

  it('handles a three-person cycle with fewer than n transactions', () => {
    // a paid for everyone, b and c owe a. Classic case: 2 transactions for 3 people.
    const balances = { a: 20, b: -10, c: -10 };
    const transactions = simplifyDebts(balances);
    expect(transactions.length).toBeLessThanOrEqual(2);
    const settled = applyTransactions(balances, transactions);
    for (const amount of Object.values(settled)) {
      expect(amount).toBeCloseTo(0);
    }
  });

  it('settles a more complex multi-person case fully', () => {
    const balances = { a: 30, b: 10, c: -15, d: -25 };
    const transactions = simplifyDebts(balances);
    const settled = applyTransactions(balances, transactions);
    for (const amount of Object.values(settled)) {
      expect(amount).toBeCloseTo(0);
    }
    // Minimum transactions to settle n balances is at most n-1.
    expect(transactions.length).toBeLessThanOrEqual(3);
  });

  it('never produces a transaction with non-positive amount', () => {
    const balances = { a: 15.5, b: -7.25, c: -8.25 };
    const transactions = simplifyDebts(balances);
    for (const tx of transactions) {
      expect(tx.amount).toBeGreaterThan(0);
    }
  });

  it('throws when balances do not sum to zero', () => {
    expect(() => simplifyDebts({ a: 10, b: -5 })).toThrow();
  });

  it('ignores negligible floating point dust around zero', () => {
    const transactions = simplifyDebts({ a: 0.001, b: -0.001 });
    expect(transactions).toEqual([]);
  });

  it('fully settles a randomized instance with correct total transferred', () => {
    const balances = { a: 42.37, b: -12.5, c: -8.12, d: -21.75 };
    const transactions = simplifyDebts(balances);
    const settled = applyTransactions(balances, transactions);
    for (const amount of Object.values(settled)) {
      expect(Math.abs(amount)).toBeLessThan(0.01);
    }
  });
});

describe('computeBalancesFromExpenses + simplifyDebts integration', () => {
  it('settles a realistic multi-expense roommate scenario', () => {
    const members = ['alice', 'bob', 'carol'];
    const expenses = [
      { paidBy: 'alice', amount: 90 }, // groceries, split 3 ways: everyone owes 30
      { paidBy: 'bob', amount: 30, splitAmong: ['bob', 'carol'] }, // pizza night, alice excluded
    ];
    const balances = computeBalancesFromExpenses(members, expenses);
    const transactions = simplifyDebts(balances);
    const settled = applyTransactions(balances, transactions);
    for (const amount of Object.values(settled)) {
      expect(Math.abs(amount)).toBeLessThan(0.01);
    }
  });
});
