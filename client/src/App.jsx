import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/RoomDetail';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/rooms"
        element={
          <PrivateRoute>
            <Rooms />
          </PrivateRoute>
        }
      />
      <Route
        path="/rooms/:roomId"
        element={
          <PrivateRoute>
            <RoomDetail />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/rooms" replace />} />
    </Routes>
  );
}
