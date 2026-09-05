function memberName(members, id) {
  const member = members.find((m) => m._id === id);
  return member ? member.name : 'Unknown';
}

function itemName(items, id) {
  const item = items.find((i) => i._id === id);
  return item ? item.name : id;
}

export default function EnvyExplanation({ allocation, members }) {
  const items = allocation.items.filter((i) => typeof i === 'object');
  const entries = Object.entries(allocation.explanation || {});
  const anyEnvy = entries.some(([, list]) => list.length > 0);

  if (!anyEnvy) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800">
        No one envies anyone else's bundle. This allocation is fully envy-free.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        A perfectly envy-free split isn't always possible with indivisible items. This allocation
        guarantees <span className="font-medium">EF1</span>: any remaining envy can always be eliminated
        by removing a single item, shown below.
      </p>
      {entries.map(([userId, list]) =>
        list.length === 0 ? null : (
          <div key={userId} className="bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="font-medium text-slate-900 mb-2">{memberName(members, userId)}</h3>
            <ul className="space-y-2">
              {list.map((entry, idx) => (
                <li key={idx} className="text-sm text-slate-700">
                  Envies <span className="font-medium">{memberName(members, entry.envies)}</span>.{' '}
                  {entry.resolved ? (
                    entry.location === 'their-bundle' ? (
                      <>
                        If <span className="font-medium">{memberName(members, entry.envies)}</span> didn't have{' '}
                        <span className="font-medium">{itemName(items, entry.eliminatingItem)}</span>, this envy
                        would disappear.
                      </>
                    ) : (
                      <>
                        If they didn't have to deal with{' '}
                        <span className="font-medium">{itemName(items, entry.eliminatingItem)}</span> themselves,
                        this envy would disappear.
                      </>
                    )
                  ) : (
                    <span className="text-red-600">No single item removal resolves this (unexpected).</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  );
}
