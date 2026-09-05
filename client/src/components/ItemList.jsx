import { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function memberName(members, id) {
  const member = members.find((m) => m._id === id);
  return member ? member.name : 'Unknown';
}

export default function ItemList({ roomId, items, members, onChanged }) {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState({});

  async function submitValuation(itemId) {
    const value = Number(drafts[itemId]);
    if (Number.isNaN(value) || value < 0) return;
    await api.put(`/rooms/${roomId}/items/${itemId}/valuation`, { value });
    onChanged();
  }

  async function handleDelete(itemId) {
    await api.delete(`/rooms/${roomId}/items/${itemId}`);
    onChanged();
  }

  if (items.length === 0) {
    return <p className="text-slate-500 text-sm">No items yet. Add one to get started.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const myValue = item.valuations?.[user._id];
        return (
          <li key={item._id} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.type === 'good' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {item.type}
                  </span>
                  <span className="font-medium text-slate-900">{item.name}</span>
                  {item.isExpense && (
                    <span className="text-xs text-slate-500">
                      ${item.amount.toFixed(2)} paid by {memberName(members, item.paidBy)}
                    </span>
                  )}
                </div>
                {item.description && <p className="text-sm text-slate-500 mt-1">{item.description}</p>}
                {item.assignedTo ? (
                  <p className="text-sm text-emerald-700 mt-2">
                    Assigned to <span className="font-medium">{memberName(members, item.assignedTo)}</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-2">Not yet allocated</p>
                )}
              </div>

              {!item.assignedTo && (
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min="0"
                    placeholder={myValue !== undefined ? String(myValue) : 'Your value'}
                    value={drafts[item._id] ?? ''}
                    onChange={(e) => setDrafts({ ...drafts, [item._id]: e.target.value })}
                    className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => submitValuation(item._id)}
                    className="text-xs font-medium text-emerald-700 hover:underline"
                  >
                    Save
                  </button>
                  <button onClick={() => handleDelete(item._id)} className="text-xs text-slate-400 hover:text-red-600">
                    Remove
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
