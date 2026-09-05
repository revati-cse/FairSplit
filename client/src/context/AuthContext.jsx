import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('fairsplit_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('fairsplit_token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  function persistSession(data) {
    localStorage.setItem('fairsplit_token', data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function register(name, email, password) {
    const res = await api.post('/auth/register', { name, email, password });
    persistSession(res.data);
  }

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    persistSession(res.data);
  }

  function logout() {
    localStorage.removeItem('fairsplit_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
