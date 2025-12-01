// components/AuthGuard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

export default function AuthGuard({ children, allowedRoles = [] }) {
  const { isAuthenticated, role, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Solo actuamos cuando 'loading' es false (ya terminó de revisar localStorage)
    if (!loading) {
      // 1. Si NO está autenticado, mandar al login
      if (!isAuthenticated) {
        router.push('/');
        return;
      }

      // 2. Si hay roles permitidos definidos y el rol del usuario NO coincide
      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        console.warn(`Acceso denegado. Rol usuario: ${role}. Roles permitidos: ${allowedRoles}`);

        // Redirigir a su panel correcto según su rol real
        if (role === 'estudiante') router.push('/estudiante');
        else if (role === 'docente') router.push('/docente');
        else if (role === 'admin') router.push('/admin');
        else router.push('/'); // Fallback
        return;
      }

      // 3. Todo correcto
      setAuthorized(true);
    }
  }, [isAuthenticated, role, loading, router, allowedRoles]);

  // Pantalla de carga mientras verifica
  if (loading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return children;
}
