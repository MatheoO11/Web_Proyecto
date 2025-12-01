import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import AuthGuard from '../../components/AuthGuard';
import { cursosData } from '../../data/cursosData';

function CursoDetalle() {
  const router = useRouter();
  const { id } = router.query;
  const { user, logout } = useAuth();
  const [activeModule, setActiveModule] = useState(null);
  const [completedItems, setCompletedItems] = useState([]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const toggleComplete = (itemId) => {
    if (completedItems.includes(itemId)) {
      setCompletedItems(completedItems.filter((i) => i !== itemId));
    } else {
      setCompletedItems([...completedItems, itemId]);
    }
  };

  const handleOpenItem = (item, modulo) => {
    // Navegar con ID compuesto: cursoId-moduloId-recursoId
    router.push(`/recurso/${id}-${modulo.id}-${item.id.split('-')[1]}`);
  };

  // Obtener datos del curso desde cursosData
  const cursoData = cursosData[id];

  if (!cursoData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Cargando curso...</div>
      </div>
    );
  }

  // Convertir modulos de objeto a array
  const modulosArray = Object.values(cursoData.modulos);

  const getIconByType = (tipo) => {
    switch (tipo) {
      case 'video': return '▶️';
      case 'lectura': return '📖';
      case 'quiz': return '❓';
      case 'tarea': return '📝';
      case 'practica': return '💻';
      default: return '📄';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/home')}
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                ← Volver
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎓</span>
                </div>
                <h1 className="text-xl font-bold text-gray-800">Campus Virtual</h1>
              </div>
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

      {/* Hero del curso */}
      <div className="bg-gradient-to-r from-green-600 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center space-x-2 mb-4">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
              En progreso
            </span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
              {cursoData.duracion}
            </span>
          </div>

          <h1 className="text-4xl font-bold mb-4">{cursoData.nombre}</h1>
          <p className="text-xl text-green-100 mb-6">{cursoData.descripcion}</p>

          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <span>👨‍🏫</span>
              <span>{cursoData.profesor}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>👥</span>
              <span>{cursoData.estudiantes} estudiantes</span>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Tu progreso en el curso</span>
              <span className="font-bold">{cursoData.progreso}%</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-500"
                style={{ width: `${cursoData.progreso}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de monitoreo activo */}
      <div className="bg-blue-50 border-l-4 border-blue-500 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 mt-6">
        <div className="flex items-center">
          <span className="text-blue-600 mr-3 text-xl">📹</span>
          <div>
            <p className="text-sm text-blue-800">
              <strong>Monitoreo de atención activo</strong>
            </p>
            <p className="text-xs text-blue-600">
              Sistema analizando movimientos de cabeza y frecuencia de parpadeo
            </p>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📚 Contenido del Curso</h2>

          {modulosArray.map((modulo) => (
            <div key={modulo.id} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Header del módulo */}
              <button
                onClick={() =>
                  setActiveModule(activeModule === modulo.id ? null : modulo.id)
                }
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-800">{modulo.nombre}</h3>
                    <p className="text-sm text-gray-600">
                      {modulo.recursos.length} elementos
                    </p>
                  </div>
                </div>
                <span className="text-2xl text-gray-400">
                  {activeModule === modulo.id ? '▼' : '▶'}
                </span>
              </button>

              {/* Contenido del módulo */}
              {activeModule === modulo.id && (
                <div className="border-t border-gray-200">
                  {modulo.recursos.map((item) => {
                    const isCompleted = completedItems.includes(item.id);

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="flex items-center space-x-4 flex-grow">
                          <button
                            onClick={() => toggleComplete(item.id)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${isCompleted
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 hover:border-green-500'
                              }`}
                          >
                            {isCompleted && (
                              <span className="text-white text-sm">✓</span>
                            )}
                          </button>

                          <span className="text-2xl">
                            {getIconByType(item.tipo)}
                          </span>

                          <div>
                            <h4
                              className={`font-medium ${isCompleted
                                ? 'line-through text-gray-400'
                                : 'text-gray-800'
                                }`}
                            >
                              {item.titulo}
                            </h4>
                            <p className="text-xs text-gray-500">
                              ⏱️ {item.duracion}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenItem(item, modulo)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                        >
                          {item.tipo === 'video' ? 'Ver' : 'Abrir'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CursoPage() {
  return (
    <AuthGuard>
      <CursoDetalle />
    </AuthGuard>
  );
}
