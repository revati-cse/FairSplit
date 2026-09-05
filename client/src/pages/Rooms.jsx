import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Navbar from '../components/Navbar';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function refresh() {
    api
      .get('/rooms')
      .then((res) => setRooms(res.data.rooms))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/rooms', { name: newRoomName });
      setNewRoomName('');
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create room');
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/rooms/join', { inviteCode });
      setInviteCode('');
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not join room');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold text-slate-900 mb-6">Your rooms</h1>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {loading ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : rooms.length === 0 ? (
          <p className="text-slate-500 text-sm mb-6">You're not in any rooms yet.</p>
        ) : (
          <ul className="space-y-2 mb-8">
            {rooms.map((room) => (
              <li key={room._id}>
                <Link
                  to={`/rooms/${room._id}`}
                  className="block bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-emerald-400"
                >
                  <div className="font-medium text-slate-900">{room.name}</div>
                  <div className="text-xs text-slate-400">
                    {room.members.length} member{room.members.length === 1 ? '' : 's'} · invite code{' '}
                    <span className="font-mono">{room.inviteCode}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="grid sm:grid-cols-2 gap-6">
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h2 className="font-medium text-slate-900 text-sm">Create a room</h2>
            <input
              required
              placeholder="e.g. 221B Baker Street"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button className="w-full rounded-lg bg-emerald-600 text-white py-2 text-sm font-medium hover:bg-emerald-700">
              Create
            </button>
          </form>

          <form onSubmit={handleJoin} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h2 className="font-medium text-slate-900 text-sm">Join a room</h2>
            <input
              required
              placeholder="Invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button className="w-full rounded-lg bg-slate-800 text-white py-2 text-sm font-medium hover:bg-slate-900">
              Join
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
