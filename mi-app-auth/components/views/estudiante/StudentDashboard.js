// components/views/estudiante/StudentDashboard.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import Layout from '../../Layout';
import Hero from '../../shared/Hero';
import RecommendationsPanel from './RecommendationsPanel';

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();

  // Estados
  const [activeTab, setActiveTab] = useState('recomendaciones'); // ⬅️ CAMBIADO: Ahora inicia en recomendaciones
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [selectedCursoId, setSelectedCursoId] = useState(null);

  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- CONEXIÓN CON DJANGO ---
  useEffect(() => {
    const fetchCursos = async () => {
      if (!token) return;

      try {
        const res = await fetch('http://127.0.0.1:8000/api/cursos/', {
          headers: { 'Authorization': `Token ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setCursos(data);
        }
      } catch (error) {
        console.error("Error de conexión:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCursos();
  }, [token]);

  // --- LÓGICA ESTRICTA DE ACCESO ---
  const handleStartCourse = (cursoId) => {
    const tienePermiso = typeof window !== 'undefined' && sessionStorage.getItem('cameraConsent');

    if (!tienePermiso) {
      setSelectedCursoId(cursoId);
      setShowCameraModal(true);
    } else {
      router.push(`/estudiante/curso/${cursoId}`);
    }
  };

  const handleAcceptMonitoring = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cameraConsent', 'true');
    }
    setShowCameraModal(false);

    if (selectedCursoId) {
      router.push(`/estudiante/curso/${selectedCursoId}`);
    }
  };

  const handleCancelMonitoring = () => {
    setShowCameraModal(false);
    setSelectedCursoId(null);
    alert("⚠️ Acceso denegado: Es requisito indispensable activar el monitoreo de atención para ingresar a los cursos.");
  };

  return (
    <Layout>
      {/* Modal de Consentimiento */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border-t-4 border-blue-600 animate-fadeIn">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">📷</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Monitoreo de Atención</h3>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Requisito Académico</p>
            </div>

            <div className="mb-6 text-gray-700 text-center space-y-4">
              <p>
                Para ingresar, el sistema activará tu cámara. El análisis de atención solo se guardará <strong>mientras reproduces los videos</strong>.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 text-left">
                <strong>🔒 Privacidad:</strong> La cámara se apaga automáticamente al salir. No se guardan videos, solo estadísticas.
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAcceptMonitoring}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-lg"
              >
                Aceptar y Entrar
              </button>

              <button
                onClick={handleCancelMonitoring}
                className="w-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-red-600 font-medium py-3 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <Hero
        title={`¡Hola, ${user?.nombre || 'Estudiante'}!`}
        subtitle="Panel de Aprendizaje"
        bgColor="from-blue-600 to-indigo-700"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TABS DE NAVEGACIÓN */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('recomendaciones')}
              className={`pb-3 px-2 font-semibold border-b-2 transition ${activeTab === 'recomendaciones'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              🤖 Recomendaciones IA
            </button>
            <button
              onClick={() => setActiveTab('mis-cursos')}
              className={`pb-3 px-2 font-semibold border-b-2 transition ${activeTab === 'mis-cursos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              📚 Mis Cursos
            </button>
          </nav>
        </div>

        {/* CONTENIDO SEGÚN TAB ACTIVA */}
        {activeTab === 'recomendaciones' && (
          <RecommendationsPanel />
        )}

        {activeTab === 'mis-cursos' && (
          <div className="min-h-[500px]">
            {loading ? (
              <div className="text-center py-10">Cargando tus cursos...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cursos.length > 0 ? cursos.map((curso) => (
                  <div key={curso.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition border border-gray-100">
                    <div className="h-2 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-4xl">{curso.icon || '📘'}</span>
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">Inscrito</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{curso.nombre}</h3>

                      <div className="flex items-center text-xs text-gray-500 mb-6 space-x-2">
                        <span>👨‍🏫 {curso.nombre_profesor}</span>
                        <span>•</span>
                        <span>{curso.modulos ? curso.modulos.length : 0} Módulos</span>
                      </div>

                      <button
                        onClick={() => handleStartCourse(curso.id)}
                        className="w-full bg-gray-900 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        Entrar al Curso <span>→</span>
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">No tienes cursos inscritos aún.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
