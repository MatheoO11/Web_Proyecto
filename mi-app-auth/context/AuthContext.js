import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true); // Carga inicial de sesión
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);

  // Restaurar sesión al recargar página
  useEffect(() => {
    const restoreSession = () => {
      try {
        if (typeof window !== 'undefined') {
          const storedToken = localStorage.getItem('token');
          const storedUser = localStorage.getItem('user');
          const storedRole = localStorage.getItem('role');

          if (storedToken && storedUser && storedRole) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setRole(storedRole);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error("Error restaurando sesión:", error);
        localStorage.clear();
      } finally {
        setLoading(false); // IMPORTANTE: Dejar de cargar siempre
      }
    };
    restoreSession();
  }, []);

  // Función de Login conectada a Django
  const login = async (email, password) => {
    try {
      console.log("Intentando conectar con Django...", { email }); // Debug

      const response = await fetch('http://127.0.0.1:8000/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log("Respuesta del servidor status:", response.status); // Debug

      const data = await response.json();

      if (response.ok) {
        // ÉXITO
        const userData = data.user;
        const userToken = data.token;
        const userRole = data.user.rol;

        setIsAuthenticated(true);
        setUser(userData);
        setRole(userRole);
        setToken(userToken);

        localStorage.setItem('token', userToken);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('role', userRole);

        return true;
      } else {
        // ERROR DEL BACKEND (Ej: credenciales malas)
        throw new Error(data.error || 'Error de autenticación');
      }
    } catch (error) {
      console.error("Error en login:", error);
      throw error; // Lanzamos el error para que la página Login quite el 'loading'
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setRole(null);
    setToken(null);
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, role, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}
