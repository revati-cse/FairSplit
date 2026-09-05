import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <Link to="/rooms" className="font-semibold text-slate-900 text-lg">
        FairSplit
      </Link>
      {user && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">{user.name}</span>
          <button onClick={logout} className="text-slate-500 hover:text-slate-900">
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
