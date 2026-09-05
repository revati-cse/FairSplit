export default function SettleUpSummary({ balances, transactions }) {
  const balanceEntries = Object.values(balances);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="font-medium text-slate-900 mb-3 text-sm">Net balances</h3>
        <ul className="space-y-1">
          {balanceEntries.map(({ user, amount }) => (
            <li key={user._id} className="flex justify-between text-sm">
              <span className="text-slate-700">{user.name}</span>
              <span className={amount >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                {amount >= 0 ? '+' : ''}
                {amount.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="font-medium text-slate-900 mb-3 text-sm">Settle up (minimum transactions)</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-400">Everyone is settled up.</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((t, idx) => (
              <li key={idx} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                <span>
                  <span className="font-medium">{t.from.name}</span> pays{' '}
                  <span className="font-medium">{t.to.name}</span>
                </span>
                <span className="font-medium text-slate-900">${t.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
