// frontend/pages/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Head from 'next/head';

export default function LoginPage() {
  // ✅ CORRECCIÓN PRINCIPAL: Llamamos a useAuth UNA sola vez y extraemos todo lo necesario.
  // Nota: Renombramos 'loading' a 'loadingAuth' para que coincida con tu lógica visual.
  const {
    user,
    login,
    authError,
    clearAuthError,
    loading: loadingAuth
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  // ✅ Evita problemas de hidratación (SSR vs CSR)
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Lógica de Redirección Automática
  useEffect(() => {
    // Si estamos cargando, no hacemos nada aún
    if (loadingAuth) return;

    // Si ya hay usuario logueado y tiene rol, redirigir
    if (user && user.rol) {
      if (user.rol === 'admin') router.push('/admin');
      else if (user.rol === 'docente') router.push('/docente');
      else if (user.rol === 'estudiante') router.push('/estudiante');
    }
  }, [user, loadingAuth, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email.trim(), password);
  };

  // ✅ Pantalla de carga (Spinner)
  // Se muestra si el componente no está montado o si AuthContext está verificando sesión
  if (!mounted || loadingAuth) {
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
          <p className="text-xs text-gray-500 mt-2">Por favor espera</p>
        </div>
      </div>
    );
  }

  // ✅ Formulario de Login (solo se ve si no hay usuario ni carga)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 p-4">
      <Head>
        <title>Login - Campus Virtual</title>
      </Head>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-50 p-8 text-center border-b border-gray-100">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Campus Virtual</h1>
          <p className="text-gray-500 text-sm mt-2">Ingresa tus credenciales institucionales</p>
        </div>

        <div className="p-8">
          {/* Alerta de Error */}
          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center animate-pulse">
              <span className="mr-2">⚠️</span> {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  if (authError) clearAuthError(); // Limpia error al escribir
                  setEmail(e.target.value);
                }}
                placeholder="usuario@universidad.edu"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none ${authError ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-300'
                  }`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  if (authError) clearAuthError(); // Limpia error al escribir
                  setPassword(e.target.value);
                }}
                placeholder="••••••••"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none ${authError ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-300'
                  }`}
              />
            </div>

            <button
              type="submit"
              disabled={loadingAuth}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loadingAuth ? 'Verificando...' : 'Ingresar al Sistema'}
            </button>
          </form>
        </div>

        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">¿Olvidaste tu contraseña? Contacta al administrador.</p>
        </div>
      </div>
    </div>
  );
}
