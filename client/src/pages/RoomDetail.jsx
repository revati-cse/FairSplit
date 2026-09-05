import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import Navbar from '../components/Navbar';
import ItemForm from '../components/ItemForm';
import ItemList from '../components/ItemList';
import AllocationResults from '../components/AllocationResults';
import EnvyExplanation from '../components/EnvyExplanation';
import SettleUpSummary from '../components/SettleUpSummary';

const TABS = ['Items', 'Allocation', 'Settle Up'];

export default function RoomDetail() {
  const { roomId } = useParams();
  const [tab, setTab] = useState('Items');
  const [room, setRoom] = useState(null);
  const [items, setItems] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [settleUp, setSettleUp] = useState(null);
  const [error, setError] = useState('');
  const [allocating, setAllocating] = useState(false);

  function refreshRoom() {
    api.get(`/rooms/${roomId}`).then((res) => setRoom(res.data.room));
  }

  function refreshItems() {
    api.get(`/rooms/${roomId}/items`).then((res) => setItems(res.data.items));
  }

  function refreshAllocations() {
    api.get(`/rooms/${roomId}/allocations`).then((res) => {
      setAllocations(res.data.allocations);
      if (res.data.allocations.length > 0) {
        loadAllocation(res.data.allocations[0]._id);
      } else {
        setSelectedAllocation(null);
      }
    });
  }

  function loadAllocation(allocationId) {
    api.get(`/rooms/${roomId}/allocations/${allocationId}`).then((res) => setSelectedAllocation(res.data.allocation));
  }

  function refreshSettleUp() {
    api.get(`/rooms/${roomId}/allocations/settle-up`).then((res) => setSettleUp(res.data));
  }

  useEffect(() => {
    refreshRoom();
    refreshItems();
    refreshAllocations();
  }, [roomId]);

  useEffect(() => {
    if (tab === 'Settle Up') refreshSettleUp();
  }, [tab, roomId]);

  async function handleRunAllocation() {
    setError('');
    setAllocating(true);
    try {
      await api.post(`/rooms/${roomId}/allocations`);
      refreshItems();
      refreshAllocations();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not run allocation');
    } finally {
      setAllocating(false);
    }
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <p className="text-slate-500 text-sm px-6 py-10">Loading…</p>
      </div>
    );
  }

  const unassignedCount = items.filter((i) => !i.assignedTo).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{room.name}</h1>
            <p className="text-xs text-slate-400">
              Invite code <span className="font-mono">{room.inviteCode}</span> · {room.members.length} members
            </p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Items' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <ItemList roomId={roomId} items={items} members={room.members} onChanged={refreshItems} />
            </div>
            <div>
              <ItemForm roomId={roomId} members={room.members} onCreated={refreshItems} />
            </div>
          </div>
        )}

        {tab === 'Allocation' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{unassignedCount} unassigned item(s)</p>
              <button
                onClick={handleRunAllocation}
                disabled={allocating || unassignedCount === 0}
                className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {allocating ? 'Allocating…' : 'Run fair allocation'}
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}

            {allocations.length > 1 && (
              <select
                onChange={(e) => loadAllocation(e.target.value)}
                value={selectedAllocation?._id || ''}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {allocations.map((a) => (
                  <option key={a._id} value={a._id}>
                    {new Date(a.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
            )}

            {selectedAllocation ? (
              <>
                <AllocationResults allocation={selectedAllocation} members={room.members} />
                <h2 className="text-lg font-medium text-slate-900 pt-4">Explain my allocation</h2>
                <EnvyExplanation allocation={selectedAllocation} members={room.members} />
              </>
            ) : (
              <p className="text-slate-500 text-sm">No allocation has been run yet.</p>
            )}
          </div>
        )}

        {tab === 'Settle Up' && (
          <div>{settleUp ? <SettleUpSummary balances={settleUp.balances} transactions={settleUp.transactions} /> : <p className="text-slate-500 text-sm">Loading…</p>}</div>
        )}
      </main>
    </div>
  );
}
