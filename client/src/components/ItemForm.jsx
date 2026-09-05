import { useState } from 'react';
import api from '../api/client';

export default function ItemForm({ roomId, members, onCreated }) {
  const [type, setType] = useState('good');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isExpense, setIsExpense] = useState(false);
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post(`/rooms/${roomId}/items`, {
        type,
        name,
        description,
        isExpense,
        amount: isExpense ? Number(amount) : undefined,
        paidBy: isExpense ? paidBy || undefined : undefined,
      });
      setName('');
      setDescription('');
      setAmount('');
      setIsExpense(false);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add item');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <h2 className="font-medium text-slate-900 text-sm">Add a good or chore</h2>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType('good')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium border ${
            type === 'good' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 text-slate-600'
          }`}
        >
          Good
        </button>
        <button
          type="button"
          onClick={() => setType('chore')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium border ${
            type === 'chore' ? 'bg-amber-600 text-white border-amber-600' : 'border-slate-300 text-slate-600'
          }`}
        >
          Chore
        </button>
      </div>

      <input
        required
        placeholder="Name (e.g. Take out trash)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={isExpense} onChange={(e) => setIsExpense(e.target.checked)} />
        This also cost money (shared expense)
      </label>

      {isExpense && (
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Paid by me</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={submitting}
        className="w-full rounded-lg bg-slate-800 text-white py-2 text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
      >
        {submitting ? 'Adding…' : 'Add item'}
      </button>
    </form>
  );
}
