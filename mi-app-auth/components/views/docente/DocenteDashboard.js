import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../Layout';
import Hero from '../../shared/Hero';
import { useAuth } from '../../../context/AuthContext';

export default function DocenteDashboard() {
  const router = useRouter();
  const { user, token } = useAuth();

  // Estados
  const [activeTab, setActiveTab] = useState('estudiantes');
  const [cursos, setCursos] = useState([]);
  const [estudiantesData, setEstudiantesData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para editar video
  const [editingRecurso, setEditingRecurso] = useState(null);
  const [videoUrlInput, setVideoUrlInput] = useState("");

  const API_URL = 'http://127.0.0.1:8000/api';

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // ✅ FUNCIÓN HELPER PARA EVITAR EL ERROR "Unexpected token <"
        // Si la API falla (404/500), devuelve un array vacío en lugar de romper la app.
        const safeFetch = async (endpoint) => {
          try {
            const res = await fetch(`${API_URL}${endpoint}`, {
              headers: { 'Authorization': `Token ${token}` }
            });
            if (!res.ok) {
              console.error(`⚠️ Error ${res.status} en ${endpoint}`);
              return [];
            }
            return await res.json();
          } catch (err) {
            console.error(`❌ Error de conexión en ${endpoint}:`, err);
            return [];
          }
        };

        // 1. Obtener Cursos del Docente
        const dataCursos = await safeFetch('/cursos/');
        setCursos(dataCursos);

        // 2. Identificar qué estudiantes están inscritos en mis cursos
        const studentIds = new Set();
        if (dataCursos.length > 0) {
          dataCursos.forEach(c => {
            if (c.estudiantes) {
              c.estudiantes.forEach(id => studentIds.add(id));
            }
          });
        }

        // 3. Obtener Usuarios (Estudiantes)
        const allStudents = await safeFetch('/users/?rol=estudiante');
        // Filtramos solo mis alumnos
        const myStudents = allStudents.filter(s => studentIds.has(s.id));

        // 4. Obtener Resultados del Test D2-R (Capacidad)
        const dataD2R = await safeFetch('/resultados-d2r/');

        // 5. Obtener Sesiones de Atención (Comportamiento en Video)
        const dataAtencion = await safeFetch('/atencion/');

        // 6. PROCESAMIENTO INTELIGENTE (Cruzar todo)
        const estudiantesProcesados = myStudents.map(est => {
          // A. Buscar mejor resultado D2R
          const historialD2R = dataD2R.filter(r => String(r.estudiante) === String(est.id));
          historialD2R.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          const ultimoD2R = historialD2R[0];

          // B. Calcular promedio de Atención en Videos
          const sesiones = dataAtencion.filter(s => String(s.estudiante) === String(est.id));
          const promedioAtencion = sesiones.length > 0
            ? (sesiones.reduce((acc, curr) => acc + curr.porcentaje_atencion, 0) / sesiones.length).toFixed(1)
            : 0;

          // C. Diagnóstico Automático (Lógica de Negocio)
          let diagnostico = "Sin datos suficientes";
          let colorDiagnostico = "text-gray-400";
          let recomendacion = "El estudiante debe realizar las actividades.";

          if (ultimoD2R && sesiones.length > 0) {
            const capacidadAlta = ultimoD2R.con >= 100; // Umbral ejemplo D2R
            const atencionAlta = promedioAtencion >= 75; // Umbral atención video

            if (capacidadAlta && atencionAlta) {
              diagnostico = "⭐ Rendimiento Óptimo";
              colorDiagnostico = "text-green-600";
              recomendacion = "Potenciar con material avanzado.";
            } else if (!capacidadAlta && !atencionAlta) {
              diagnostico = "🚨 Riesgo Académico";
              colorDiagnostico = "text-red-600";
              recomendacion = "Requiere tutoría personalizada urgente.";
            } else if (capacidadAlta && !atencionAlta) {
              diagnostico = "⚠️ Desmotivación";
              colorDiagnostico = "text-yellow-600";
              recomendacion = "Tiene capacidad pero se distrae. Revisar interés.";
            } else if (!capacidadAlta && atencionAlta) {
              diagnostico = "💪 Alto Esfuerzo";
              colorDiagnostico = "text-blue-600";
              recomendacion = "Felicitar esfuerzo. Reforzar bases cognitivas.";
            }
          }

          // Buscar curso de forma segura
          const cursoDelEstudiante = dataCursos.find(c => c.estudiantes && c.estudiantes.includes(est.id));

          return {
            id: est.id,
            nombre: est.nombre_completo || est.username,
            email: est.email,
            cursoNombre: cursoDelEstudiante ? cursoDelEstudiante.nombre : 'Sin Asignar',

            // Datos para mostrar
            d2r_con: ultimoD2R ? ultimoD2R.con : '-',
            video_avg: sesiones.length > 0 ? `${promedioAtencion}%` : '-',
            sesiones_count: sesiones.length,

            diagnostico,
            colorDiagnostico,
            recomendacion
          };
        });

        setEstudiantesData(estudiantesProcesados);

      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // --- HANDLERS VIDEO (Tu código original adaptado) ---
  const openVideoEditor = (recurso) => {
    setEditingRecurso(recurso);
    setVideoUrlInput(recurso.url_contenido || "");
  };

  const saveVideoUrl = async () => {
    if (!editingRecurso || !token) return;
    try {
      const res = await fetch(`${API_URL}/recursos/${editingRecurso.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ url_contenido: videoUrlInput })
      });
      if (res.ok) {
        alert("Video actualizado correctamente");
        setEditingRecurso(null);
        window.location.reload();
      }
    } catch (error) { console.error(error); }
  };

  // --- RENDERIZADO ---

  const renderTabContent = () => {
    switch (activeTab) {
      case 'estudiantes':
        return (
          <div className="grid grid-cols-1 gap-6 animate-fadeIn">
            {estudiantesData.length > 0 ? estudiantesData.map((est) => (
              <div key={est.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition">
                {/* Perfil del Estudiante */}
                <div className="p-6 bg-gray-50 md:w-1/3 flex flex-col items-center justify-center border-r border-gray-100">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mb-3">
                    {(est.nombre && est.nombre[0]) || 'U'}
                  </div>
                  <h3 className="font-bold text-gray-800 text-center">{est.nombre}</h3>
                  <p className="text-xs text-gray-500 mb-2">{est.email}</p>
                  <span className="text-[10px] bg-white border px-2 py-1 rounded text-gray-400 uppercase tracking-wide">
                    {est.cursoNombre}
                  </span>
                </div>

                {/* Métricas y Diagnóstico */}
                <div className="p-6 md:w-2/3 flex flex-col justify-center">
                  <div className="flex justify-between mb-4">
                    <div className="text-center w-1/2 border-r border-gray-100">
                      <p className="text-xs text-blue-800 font-bold uppercase">Capacidad (D2-R)</p>
                      <p className="text-2xl font-bold text-blue-600">{est.d2r_con}</p>
                    </div>
                    <div className="text-center w-1/2">
                      <p className="text-xs text-purple-800 font-bold uppercase">Atención (Cámara)</p>
                      <p className="text-2xl font-bold text-purple-600">{est.video_avg}</p>
                      <p className="text-[9px] text-gray-400">{est.sesiones_count} videos vistos</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Diagnóstico IA</p>
                    <p className={`text-lg font-bold ${est.colorDiagnostico}`}>
                      {est.diagnostico}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 italic">
                      "{est.recomendacion}"
                    </p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-gray-400">
                No hay estudiantes con actividad registrada aún.
              </div>
            )}
          </div>
        );

      case 'mis-cursos':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
              <h3 className="font-bold text-blue-800">👋 Panel de Contenido</h3>
              <p className="text-sm text-blue-600">Gestiona los enlaces de tus videos aquí.</p>
            </div>
            {cursos.map(curso => (
              <div key={curso.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{curso.icon || '📘'}</span>
                    <h3 className="font-bold text-gray-800">{curso.nombre}</h3>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {curso.modulos?.map(modulo => (
                    <div key={modulo.id}>
                      <h4 className="font-bold text-gray-700 mb-2 border-b pb-1">{modulo.nombre}</h4>
                      <div className="space-y-2 pl-2">
                        {modulo.recursos?.map(recurso => (
                          <div key={recurso.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200">
                            <div className="flex items-center gap-2">
                              <span>{recurso.tipo === 'video' ? '📺' : recurso.tipo === 'quiz' ? '🧠' : '📄'}</span>
                              <span className="text-sm">{recurso.titulo}</span>
                            </div>
                            {recurso.tipo === 'video' && (
                              <button onClick={() => openVideoEditor(recurso)} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 font-bold">
                                Editar Link
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      default: return null;
    }
  };

  return (
    <Layout>
      <Hero title="Panel Docente" subtitle="Analítica Avanzada de Atención y Rendimiento" bgColor="from-green-600 to-teal-700" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
          <button
            onClick={() => setActiveTab('estudiantes')}
            className={`py-2 px-6 rounded-lg font-medium text-sm transition ${activeTab === 'estudiantes' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📊 Reporte de Atención
          </button>
          <button
            onClick={() => setActiveTab('mis-cursos')}
            className={`py-2 px-6 rounded-lg font-medium text-sm transition ${activeTab === 'mis-cursos' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📚 Gestión de Cursos
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>

      {/* Modal Video */}
      {editingRecurso && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Editar Video</h3>
            <input
              type="text"
              value={videoUrlInput}
              onChange={(e) => setVideoUrlInput(e.target.value)}
              className="w-full p-3 border rounded mb-4"
              placeholder="URL YouTube"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingRecurso(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
              <button onClick={saveVideoUrl} className="px-4 py-2 bg-green-600 text-white rounded font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
