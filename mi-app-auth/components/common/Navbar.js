import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext'; // ✅ CORREGIDO: Dos niveles arriba

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const getBgColor = () => {
    if (role === 'estudiante') return 'bg-blue-600';
    if (role === 'docente') return 'bg-green-600';
    if (role === 'admin') return 'bg-purple-600';
    return 'bg-blue-600';
  };

  const getIcon = () => {
    if (role === 'estudiante') return '🎓';
    if (role === 'docente') return '👨‍🏫';
    if (role === 'admin') return '👨‍💼';
    return '🎓';
  };

  const getRoleLabel = () => {
    if (role === 'estudiante') return 'Estudiante';
    if (role === 'docente') return 'Docente';
    if (role === 'admin') return 'Administrador';
    return '';
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => router.push('/home')}
          >
            <div className={`w-10 h-10 ${getBgColor()} rounded-lg flex items-center justify-center`}>
              <span className="text-2xl">{getIcon()}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">
              Campus Virtual - {getRoleLabel()}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
