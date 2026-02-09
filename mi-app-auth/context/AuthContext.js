import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // <--- AGREGADO: Estado para el token
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const router = useRouter();
  const API_URL = 'http://127.0.0.1:8000/api';

  useEffect(() => {
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUser = async () => {
    const storedToken = localStorage.getItem('token'); // <--- Leemos del localStorage
    if (!storedToken) {
      setLoading(false);
      return;
    }

    // Guardamos el token en el estado para que el Dashboard lo pueda usar
    setToken(storedToken);

    try {
      const res = await fetch(`${API_URL}/me/`, {
        headers: { Authorization: `Token ${storedToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem('token');
        setToken(null); // Limpiamos estado
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
      const res = await fetch(`${API_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token); // <--- Actualizamos estado

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
    setToken(null); // <--- Limpiamos estado
    setUser(null);
    router.push('/');
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{
      user,
      token, // <--- IMPORTANTE: Ahora exportamos el token
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
