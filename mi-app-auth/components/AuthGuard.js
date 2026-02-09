import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

export default function AuthGuard({ allowedRoles = [], children }) {
  const router = useRouter();

  // CORRECCIÓN: Usamos 'loading' (que sí existe en tu Context)
  // y 'user'. No pedimos 'token' porque tu Context no lo exporta en 'value'.
  const { user, loading } = useAuth();

  useEffect(() => {
    // 1. Si está cargando, NO hacemos nada. Esperamos.
    if (loading) return;

    // 2. Si ya terminó de cargar y NO hay usuario logueado
    if (!user) {
      router.replace('/');
      return;
    }

    // 3. Validación de Roles
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
      // Si el usuario intenta entrar donde no debe, lo redirigimos a SU dashboard
      // para evitar que rebote al login.
      if (user.rol === 'estudiante') router.replace('/estudiante');
      else if (user.rol === 'docente') router.replace('/docente');
      else if (user.rol === 'admin') router.replace('/admin');
      else router.replace('/');
    }
  }, [loading, user, allowedRoles, router]);

  // --- RENDERIZADO VISUAL ---

  // 1. Pantalla de Carga (Spinner)
  // Usamos 'loading' real del contexto
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 p-4">
        <div className="bg-white/95 rounded-2xl shadow-2xl w-full max-w-md p-10 text-center">
          <div className="flex justify-center mb-4">
            <svg className="animate-spin h-7 w-7 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
          <p className="text-sm text-gray-700 font-semibold">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // 2. Si no hay usuario (y ya terminó loading), return null para evitar parpadeos antes del redirect
  if (!user) return null;

  // 3. Si el rol no es correcto, return null
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) return null;

  // 4. Todo correcto: renderizar la página
  return children;
}
