function memberName(members, id) {
  const member = members.find((m) => m._id === id);
  return member ? member.name : 'Unknown';
}

export default function AllocationResults({ allocation, members }) {
  const byUser = {};
  for (const assignment of allocation.assignments) {
    const userId = assignment.user?._id || assignment.user;
    if (!byUser[userId]) byUser[userId] = [];
    byUser[userId].push(assignment.item);
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {Object.entries(byUser).map(([userId, items]) => (
        <div key={userId} className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-medium text-slate-900 mb-2">{memberName(members, userId)}</h3>
          <ul className="space-y-1">
            {items.map((item) => {
              const doc = typeof item === 'object' ? item : null;
              return (
                <li key={doc?._id || item} className="text-sm flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      doc?.type === 'chore' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {doc?.type || 'item'}
                  </span>
                  <span className="text-slate-700">{doc?.name || item}</span>
                </li>
              );
            })}
            {items.length === 0 && <li className="text-sm text-slate-400">Nothing assigned</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}
