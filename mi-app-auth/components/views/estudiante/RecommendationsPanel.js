// components/views/estudiante/RecommendationsPanel.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import EvaluacionAdaptativa from './EvaluacionAdaptativa';
import ResultadosEvolucion from './ResultadosEvolucion';
import RecursosRecomendados from './RecursosRecomendados';

export default function RecommendationsPanel() {
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showEvaluacion, setShowEvaluacion] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('resumen'); // resumen, evolucion, recursos

  useEffect(() => {
    if (!token) return;      // espera al token
    fetchRecomendaciones(); // ahora sí
  }, [token]);


  const fetchRecomendaciones = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/recomendaciones/', {
        headers: { Authorization: `Token ${token}` },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error('Error recomendaciones:', res.status, txt);
        setError('No se pudieron cargar las recomendaciones');
        return;
      }

      const datos = await res.json();
      setData(datos);
    } catch (err) {
      console.error('Error cargando recomendaciones:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluacionClose = (shouldRefresh) => {
    setShowEvaluacion(false);

    // Si completó evaluación, mandamos a evolución (para ver el gráfico)
    if (shouldRefresh) {
      setActiveSubTab('evolucion');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 mb-8">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Analizando tu perfil con IA...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
        <p className="text-red-700">⚠️ {error}</p>
        <button
          onClick={fetchRecomendaciones}
          className="mt-4 bg-white hover:bg-gray-100 border border-red-200 text-red-700 font-medium py-2 px-4 rounded-lg transition"
        >
          🔄 Reintentar
        </button>
      </div>
    );
  }

  if (!data || !data.recomendaciones) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
        <p className="text-gray-600">No hay recomendaciones disponibles aún.</p>
      </div>
    );
  }

  const { perfil = {}, analisis_general = '', recomendaciones = [] } = data;

  const totalSesiones = perfil?.estadisticas_atencion?.total_sesiones ?? 0;
  const promedioAtencion = perfil?.estadisticas_atencion?.promedio_atencion ?? 0;
  const sesionesBajas = perfil?.estadisticas_atencion?.sesiones_bajas ?? 0;
  const conD2R = perfil?.d2r?.existe ? perfil?.d2r?.con : 'N/A';
  const patron = perfil?.patron?.patron ?? 'SIN_DATOS';

  // Iconos por tipo
  const iconosPorTipo = {
    repasar_video: '🔄',
    recurso_alternativo: '📚',
    estrategia_estudio: '🧠',
    ejercicio_atencion: '🎯',
    contenido_avanzado: '🚀',
    felicitacion: '🌟',
  };

  // Colores por prioridad
  const coloresPrioridad = {
    alta: 'bg-red-100 text-red-700 border-red-300',
    media: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    baja: 'bg-green-100 text-green-700 border-green-300',
  };

  return (
    <div className="space-y-6">
      {/* MODAL DE EVALUACIÓN */}
      {showEvaluacion && (
        <EvaluacionAdaptativa
          // ✅ No dependemos de un campo que no existe en backend
          recursoId={null}
          onClose={handleEvaluacionClose}
        />
      )}

      {/* HEADER CON ANÁLISIS GENERAL */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">🤖 Análisis Inteligente</h2>
            <p className="text-blue-100 text-sm mb-4">
              Basado en tu Test D2R y {totalSesiones} sesiones de video
            </p>
            <p className="text-lg leading-relaxed">{analisis_general}</p>
          </div>

          {/* BADGE DEL PATRÓN */}
          <div className="ml-4 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
            <div className="text-3xl mb-1">
              {patron === 'PATRON_D'
                ? '⭐'
                : patron === 'PATRON_A'
                  ? '💪'
                  : patron === 'PATRON_B'
                    ? '🎯'
                    : '📈'}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide">{patron.replace('_', ' ')}</p>
          </div>
        </div>

        {/* ESTADÍSTICAS RÁPIDAS */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/20">
          <div className="text-center">
            <div className="text-3xl font-bold">{conD2R}</div>
            <div className="text-xs text-blue-100 uppercase tracking-wide mt-1">Concentración D2R</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{promedioAtencion}%</div>
            <div className="text-xs text-blue-100 uppercase tracking-wide mt-1">Atención Promedio</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{sesionesBajas}</div>
            <div className="text-xs text-blue-100 uppercase tracking-wide mt-1">Sesiones Bajas</div>
          </div>
        </div>

        {/* BOTÓN DE EVALUACIÓN */}
        <div className="mt-6 pt-4 border-t border-white/20">
          <button
            onClick={() => setShowEvaluacion(true)}
            className="w-full bg-white hover:bg-gray-100 text-blue-600 font-bold py-4 rounded-lg transition shadow-lg flex items-center justify-center gap-2"
          >
            <span className="text-2xl">📝</span>
            Hacer Evaluación Adaptativa
          </button>
          <p className="text-xs text-blue-100 text-center mt-2">
            La IA generará una evaluación personalizada según tu nivel de atención
          </p>
        </div>
      </div>

      {/* SUB-TABS */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveSubTab('resumen')}
            className={`pb-3 px-2 font-semibold border-b-2 transition ${activeSubTab === 'resumen'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            💡 Recomendaciones
          </button>
          <button
            onClick={() => setActiveSubTab('evolucion')}
            className={`pb-3 px-2 font-semibold border-b-2 transition ${activeSubTab === 'evolucion'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            📈 Evolución
          </button>
          <button
            onClick={() => setActiveSubTab('recursos')}
            className={`pb-3 px-2 font-semibold border-b-2 transition ${activeSubTab === 'recursos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            📚 Recursos Extra
          </button>
        </nav>
      </div>

      {/* CONTENIDO SEGÚN SUB-TAB */}
      {activeSubTab === 'resumen' && (
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            💡 Recomendaciones Personalizadas
            <span className="text-sm font-normal text-gray-500">({recomendaciones.length} sugerencias)</span>
          </h3>

          {recomendaciones.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <p className="text-gray-600">Aún no hay recomendaciones. Mira algunos videos y realiza el D2R.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recomendaciones.map((rec, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border-l-4 border-blue-500 overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{rec.icono || iconosPorTipo[rec.tipo] || '📌'}</span>
                        <div>
                          <h4 className="font-bold text-gray-800 text-lg leading-tight">{rec.titulo}</h4>
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-1 rounded mt-1 ${coloresPrioridad[rec.prioridad] || 'bg-gray-100 text-gray-700 border-gray-300'
                              }`}
                          >
                            Prioridad: {rec.prioridad || 'media'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-700 text-sm leading-relaxed mb-4">{rec.descripcion}</p>

                    {rec.recurso_id ? (
                      <button
                        onClick={() => (window.location.href = `/estudiante/recurso/${rec.recurso_id}`)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        Ver Recurso <span>→</span>
                      </button>
                    ) : (
                      <div className="text-center py-2 text-gray-500 text-sm italic">
                        {rec.tipo === 'felicitacion' ? '¡Sigue así! 🎉' : 'Aplicar en tu estudio'}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 px-5 py-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{(rec.tipo || '').replace(/_/g, ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'evolucion' && <ResultadosEvolucion />}

      {activeSubTab === 'recursos' && <RecursosRecomendados />}

      {/* FOOTER */}
      <div className="bg-gray-50 rounded-xl p-5 flex items-center justify-between border border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <p className="font-semibold text-gray-800">¿Necesitas más ayuda?</p>
            <p className="text-sm text-gray-600">
              Estas recomendaciones se actualizan automáticamente con cada video que ves y evaluación que completas.
            </p>
          </div>
        </div>
        <button
          onClick={fetchRecomendaciones}
          className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition"
        >
          🔄 Actualizar
        </button>
      </div>
    </div>
  );
}
