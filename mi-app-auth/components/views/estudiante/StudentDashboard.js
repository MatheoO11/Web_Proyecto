import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import Layout from '../../Layout';
import Hero from '../../shared/Hero';

export default function StudentDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Estados de la vista
  const [activeTab, setActiveTab] = useState('mis-cursos');
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [selectedCursoId, setSelectedCursoId] = useState(null);

  // --- DATOS SIMULADOS (Mock Data) ---
  const cursos = [
    { id: 3, nombre: 'Base de Datos', progreso: 45, color: 'green', icon: '🗄️' },
  ];

  const cursosRecomendaciones = [
    {
      id: 3,
      nombre: 'Base de Datos',
      icon: '🗄️',
      modulos: [
        { id: 1, nombre: 'Módulo 1', cantidad: 5 },
      ]
    },
  ];

  const misResultados = [
    {
      id: 1,
      cursoNombre: 'Base de Datos',
      moduloNombre: 'Módulo 1: Introducción a Bases de Datos',
      fecha: '15 Nov 2024',
      nivelAtencion: 72,
      estado: 'Bueno',
      cursoId: 3,
      moduloId: 1
    },
  ];

  // --- HANDLERS ---

  const handleStartCourse = (cursoId) => {
    // Verificamos si el usuario ya dio consentimiento en esta sesión
    if (typeof window !== 'undefined' && !sessionStorage.getItem('cameraConsent')) {
      setSelectedCursoId(cursoId);
      setShowCameraModal(true);
    } else {
      router.push(`/curso/${cursoId}`);
    }
  };

  const handleAcceptMonitoring = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cameraConsent', 'true');
    }
    setShowCameraModal(false);
    router.push(`/curso/${selectedCursoId}`);
  };

  return (
    <Layout>
      {/* --- MODAL DE CONSENTIMIENTO DE CÁMARA --- */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform scale-100 transition-all">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">📷</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Monitoreo de Atención</h3>
              <p className="text-sm text-gray-500">Sistema experimental de análisis</p>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4 text-center">
                Durante este curso, tu cámara será activada para monitorear tu nivel de
                atención mediante el análisis de:
              </p>
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">👀</span>
                  <span className="text-sm text-gray-700 font-medium">Frecuencia de parpadeo</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🎯</span>
                  <span className="text-sm text-gray-700 font-medium">Movimientos de cabeza</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-green-800 text-center">
                <strong>🔒 Confidencialidad garantizada:</strong> Esta información es confidencial
                y se usa únicamente con fines académicos.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAcceptMonitoring}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition shadow-lg transform active:scale-95"
              >
                Entiendo y acepto continuar
              </button>

              <button
                onClick={() => setShowCameraModal(false)}
                className="w-full text-gray-600 hover:text-gray-800 text-sm font-medium py-2 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HERO SECTION --- */}
      <Hero
        title={`¡Hola, ${user?.nombre?.split(' ')[0] || 'Estudiante'}!`}
        subtitle="Continúa tu aprendizaje donde lo dejaste"
        bgColor="from-blue-600 to-indigo-700"
      />

      {/* --- NAVEGACIÓN TABS --- */}
      <div className="bg-white border-b sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {['mis-cursos', 'recomendaciones', 'resultados'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab === 'mis-cursos' && '📚 Mis Cursos'}
                {tab === 'recomendaciones' && '⭐ Recomendaciones'}
                {tab === 'resultados' && '📊 Mis Resultados'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[500px]">

        {/* TAB: MIS CURSOS */}
        {activeTab === 'mis-cursos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cursos.map((curso) => (
              <div key={curso.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition duration-300 overflow-hidden border border-gray-100">
                <div className="h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl filter drop-shadow-sm">{curso.icon}</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      En progreso
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">{curso.nombre}</h3>
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Avance</span>
                      <span className="font-semibold">{curso.progreso}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${curso.progreso}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartCourse(curso.id)}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center group"
                  >
                    Continuar curso
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: RECOMENDACIONES */}
        {activeTab === 'recomendaciones' && (
          <div className="space-y-6">
            {cursosRecomendaciones.map((curso) => (
              <div key={curso.id} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-3xl">
                    {curso.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{curso.nombre}</h3>
                    <p className="text-sm text-gray-500">Recursos de refuerzo basados en tu atención</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {curso.modulos.map((mod) => (
                    <div key={mod.id} className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800">{mod.nombre}</h4>
                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                          {mod.cantidad} recursos
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">Material sugerido para repasar.</p>

                      <button
                        onClick={() => router.push(`/recomendaciones/${curso.id}/${mod.id}`)}
                        className="w-full text-center bg-white border border-gray-300 hover:border-orange-500 hover:text-orange-600 text-gray-700 px-3 py-2 rounded-lg transition text-sm font-medium"
                      >
                        Ver material →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: RESULTADOS */}
        {activeTab === 'resultados' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Historial de Evaluaciones</h2>
                <p className="text-gray-600">Resultados de tus sesiones con monitoreo</p>
              </div>
            </div>

            {misResultados.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <span className="text-6xl mb-4 block opacity-50">📝</span>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Aún no hay registros
                </h3>
                <p className="text-gray-600">
                  Completa tu primer módulo con monitoreo activado para ver tus métricas.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {misResultados.map((resultado) => (
                  <div
                    key={resultado.id}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 border border-gray-100"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                      {/* Izquierda: Info Curso */}
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${resultado.nivelAtencion >= 80 ? 'bg-green-100' :
                            resultado.nivelAtencion >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                            }`}
                        >
                          {resultado.nivelAtencion >= 80 ? '🌟' : resultado.nivelAtencion >= 60 ? '📊' : '📉'}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">
                            {resultado.cursoNombre}
                          </h3>
                          <p className="text-sm text-gray-600 font-medium">{resultado.moduloNombre}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            📅 Realizado el {resultado.fecha}
                          </p>
                        </div>
                      </div>

                      {/* Derecha: Métricas y Botones */}
                      <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                        <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase font-semibold">Atención Promedio</p>
                          <div className="flex items-end justify-end space-x-1">
                            <span className={`text-3xl font-bold leading-none ${resultado.nivelAtencion >= 80 ? 'text-green-600' :
                              resultado.nivelAtencion >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                              {resultado.nivelAtencion}%
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${resultado.nivelAtencion >= 80 ? 'bg-green-100 text-green-700' :
                            resultado.nivelAtencion >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {resultado.estado}
                          </span>
                        </div>

                        <div className="flex flex-col space-y-2 min-w-[140px]">
                          <button
                            onClick={() => router.push(`/resultados/${resultado.cursoId}-${resultado.moduloId}-test`)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm text-center"
                          >
                            Ver Detalle
                          </button>
                          <button
                            onClick={() => alert('Descargando informe...')}
                            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                          >
                            <span>📄</span> PDF
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
