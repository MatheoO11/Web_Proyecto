import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import AuthGuard from '../components/AuthGuard';
import HomeEstudiante from '../components/homes/home-estudiante';
import HomeDocente from '../components/homes/home-docente';
import HomeAdmin from '../components/views/admin/AdminDashboard';

function HomePage() {
  const { role } = useAuth();
  const router = useRouter();

  // Verificar que exista un rol
  useEffect(() => {
    if (!role) {
      router.push('/');
    }
  }, [role, router]);

  // Renderizar componente según rol (SIN AuthGuard duplicado)
  if (role === 'estudiante') return <HomeEstudiante />;
  if (role === 'docente') return <HomeDocente />;
  if (role === 'admin') return <HomeAdmin />;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">Cargando...</div>
    </div>
  );
}

// ✅ SOLO UN AuthGuard aquí (no en los componentes hijos)
export default function Home() {
  return (
    <AuthGuard>
      <HomePage />
    </AuthGuard>
  );
}
