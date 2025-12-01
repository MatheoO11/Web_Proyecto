import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
// import { useAuth } from '../../context/AuthContext'; // Probablemente no necesites useAuth aquí si solo mostrabas datos
import Layout from '../../Layout';
import Hero from '../../shared/Hero';

// ✅ Export directo
export default function DocenteDashboard() {
  const router = useRouter();

  // Estados
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [selectedEstudiante, setSelectedEstudiante] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    // ⚠️ Validación de rol eliminada (ya hecha por AuthGuard en pages)

    // Datos simulados
    const fetchedEstudiantes = [
      {
        id: 1,
        nombre: 'Juan Pérez',
        email: 'juan.perez@universidad.edu',
        ultimaEvaluacion: '15 Nov 2024',
        curso: 'Base de Datos',
        modulo: 'Módulo 1',
        retroalimentacion: 'Excelente rendimiento, sigue así!'
      },
      {
        id: 2,
        nombre: 'Ana García',
        email: 'ana.garcia@universidad.edu',
        ultimaEvaluacion: '14 Nov 2024',
        curso: 'Base de Datos',
        modulo: 'Módulo 2',
        retroalimentacion: 'Buen progreso, revisa algunos conceptos de la última unidad.'
      },
      {
        id: 3,
        nombre: 'Carlos López',
        email: 'carlos.lopez@universidad.edu',
        ultimaEvaluacion: '16 Nov 2024',
        curso: 'Base de Datos',
        modulo: 'Módulo 1',
        retroalimentacion: 'Necesita mejorar en la parte final del curso.'
      },
      {
        id: 4,
        nombre: 'María Torres',
        email: 'maria.torres@universidad.edu',
        ultimaEvaluacion: '15 Nov 2024',
        curso: 'Base de Datos',
        modulo: 'Módulo 3',
        retroalimentacion: 'Excelente atención, sigue manteniendo el enfoque.'
      }
    ];

    setEstudiantes(fetchedEstudiantes);
    setLoading(false);
  }, []);

  // Manejadores de eventos (Handlers)
  const handleAddFeedback = () => {
    alert(`Agregar retroalimentación para el estudiante: ${selectedEstudiante.nombre} con ID ${selectedEstudiante.id}`);
    // Aquí iría la llamada al backend
    setShowFeedbackModal(false);
    setFeedback("");
  };

  const handleOpenFeedbackModal = (estudiante) => {
    setSelectedEstudiante(estudiante);
    setShowFeedbackModal(true);
  };

  return (
    <Layout>
      {/* Hero Component integrado */}
      <Hero
        title="¡Bienvenido, Docente!"
        subtitle="Monitorea el rendimiento y nivel de atención de tus estudiantes"
        bgColor="from-green-600 to-teal-700"
      />

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">📋 Estudiantes del Curso</h2>
          <p className="text-gray-600">Revisa el desempeño individual de cada estudiante y agrega retroalimentación.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando estudiantes...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {estudiantes.map((estudiante) => (
              <div key={estudiante.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-green-500 to-teal-600"></div>

                <div className="p-6">
                  {/* Header del estudiante */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">👨‍🎓</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{estudiante.nombre}</h3>
                        <p className="text-sm text-gray-500">{estudiante.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Información del curso */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Última evaluación</p>
                    <p className="text-sm font-semibold text-gray-800">{estudiante.curso} - {estudiante.modulo}</p>
                    <p className="text-xs text-gray-500 mt-1">📅 {estudiante.ultimaEvaluacion}</p>
                  </div>

                  {/* Retroalimentación existente */}
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Retroalimentación actual</p>
                    <p className="text-sm text-gray-700 italic">"{estudiante.retroalimentacion}"</p>
                    <div className="flex space-x-4 mt-3">
                      <button
                        onClick={() => handleOpenFeedbackModal(estudiante)}
                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition"
                      >
                        ✏️ Editar Feedback
                      </button>
                    </div>
                  </div>

                  {/* Ver detalles */}
                  <button
                    onClick={() => router.push(`/resultados/${estudiante.id}`)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center space-x-2"
                  >
                    <span>📊</span>
                    <span>Ver Análisis Detallado</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para agregar retroalimentación */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              Feedback para {selectedEstudiante?.nombre.split(' ')[0]}
            </h3>
            <p className="text-sm text-gray-500 mb-4">Agrega comentarios sobre el desempeño reciente.</p>

            <textarea
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              rows="4"
              placeholder="Escribe la retroalimentación aquí..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            ></textarea>

            <div className="mt-6 flex justify-between space-x-3">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddFeedback}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
