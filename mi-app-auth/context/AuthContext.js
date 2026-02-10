import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { API_URL } from '@/config/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const router = useRouter();

  useEffect(() => {
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUser = async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    setToken(storedToken);

    try {
      // ✅ CORREGIDO: Agregado /api/
      const res = await fetch(`${API_URL}/api/me/`, {
        headers: { Authorization: `Token ${storedToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Error verificando sesión:", error);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setAuthError(null);
    try {
      // ✅ CORREGIDO: Agregado /api/
      const res = await fetch(`${API_URL}/api/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);

        const userData = { email, ...data };
        setUser(userData);

        // Redirección
        if (data.rol === 'admin') router.push('/admin');
        else if (data.rol === 'docente') router.push('/docente');
        else if (data.rol === 'estudiante') router.push('/estudiante');
        else router.push('/home');

        return { success: true };
      } else {
        const msg = data.error || "Credenciales inválidas";
        setAuthError(msg);
        return { success: false, error: msg };
      }
    } catch (error) {
      setAuthError("Error de conexión");
      return { success: false, error: "Error de conexión" };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    router.push('/');
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      authError,
      clearAuthError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
