/**
 * Settle-up debt simplification for shared expenses.
 *
 * Given each person's net balance (positive = owed money, negative = owes
 * money), produce a small set of transactions that settles all balances.
 * This is the classic "Splitwise" min-cash-flow heuristic: repeatedly
 * match the largest creditor with the largest debtor. Minimizing the
 * exact number of transactions is NP-hard in general (it reduces to exact
 * set-partition-style reasoning), but this greedy heap-based approach is
 * the standard practical approximation and produces at most n-1
 * transactions for n people.
 */

const EPSILON = 0.005; // half a cent; balances are treated as currency amounts

/**
 * Compute each member's net balance from a list of expenses.
 * @param {string[]} members - all room member ids
 * @param {Array<{paidBy: string, amount: number, splitAmong?: string[]}>} expenses
 *   `splitAmong` defaults to `members` (even split across everyone).
 * @returns {Record<string, number>} balances - positive = owed to them, negative = owes
 */
function computeBalancesFromExpenses(members, expenses) {
  const balances = Object.fromEntries(members.map((m) => [m, 0]));

  for (const expense of expenses) {
    const participants = expense.splitAmong && expense.splitAmong.length > 0 ? expense.splitAmong : members;
    const share = expense.amount / participants.length;

    if (!(expense.paidBy in balances)) {
      throw new Error(`Expense paidBy "${expense.paidBy}" is not a room member`);
    }
    balances[expense.paidBy] += expense.amount;

    for (const participant of participants) {
      if (!(participant in balances)) {
        throw new Error(`Expense participant "${participant}" is not a room member`);
      }
      balances[participant] -= share;
    }
  }

  return roundBalances(balances);
}

function roundBalances(balances) {
  const rounded = {};
  for (const [agent, amount] of Object.entries(balances)) {
    rounded[agent] = Math.round(amount * 100) / 100;
  }
  return rounded;
}

/**
 * Simplify a set of net balances into a minimal-ish list of transactions
 * via greedy largest-creditor/largest-debtor matching.
 * @param {Record<string, number>} balances - positive = owed to them, negative = owes
 * @returns {Array<{from: string, to: string, amount: number}>}
 */
function simplifyDebts(balances) {
  const creditors = [];
  const debtors = [];

  for (const [agent, amount] of Object.entries(balances)) {
    if (amount > EPSILON) creditors.push({ agent, amount });
    else if (amount < -EPSILON) debtors.push({ agent, amount: -amount });
  }

  const totalCredit = creditors.reduce((sum, c) => sum + c.amount, 0);
  const totalDebt = debtors.reduce((sum, d) => sum + d.amount, 0);
  if (Math.abs(totalCredit - totalDebt) > EPSILON * Math.max(1, creditors.length + debtors.length)) {
    throw new Error(
      `Balances must sum to zero to be settleable (total credit ${totalCredit}, total debt ${totalDebt})`
    );
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0;
  let j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.round(Math.min(creditor.amount, debtor.amount) * 100) / 100;

    if (amount > EPSILON) {
      transactions.push({ from: debtor.agent, to: creditor.agent, amount });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount <= EPSILON) i++;
    if (debtor.amount <= EPSILON) j++;
  }

  return transactions;
}

module.exports = { computeBalancesFromExpenses, simplifyDebts };
