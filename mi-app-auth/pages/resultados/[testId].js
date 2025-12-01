import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import AuthGuard from '../../components/AuthGuard';
import { cursosData } from '../../data/cursosData';

function ResultadosTest() {
  const router = useRouter();
  const { testId } = router.query;
  const { user, logout, role } = useAuth();

  // Parse: "cursoId-moduloId-test" o solo "estudianteId" para docentes
  const parts = (testId || '').split('-');
  const esVistaDocente = parts.length === 1; // Si solo tiene un ID, es la vista de docente

  let cursoId, moduloId, estudianteId;

  if (esVistaDocente) {
    // Vista de docente: solo viene el ID del estudiante
    estudianteId = parts[0];
  } else {
    // Vista de estudiante: viene cursoId-moduloId-test
    [cursoId, moduloId] = parts;
  }

  const curso = !esVistaDocente ? cursosData[cursoId] : null;
  const modulo = !esVistaDocente && curso ? curso.modulos[moduloId] : null;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Datos simulados del análisis (en producción vendrían del backend)
  const resultados = esVistaDocente ? {
    // Datos para vista de docente
    estudiante: {
      id: estudianteId,
      nombre: 'Juan Pérez',
      email: 'juan.perez@universidad.edu'
    },
    curso: 'Base de Datos',
    modulo: 'Módulo 1: Introducción a Bases de Datos',
    fecha: '15 Nov 2024',
    nivelAtencion: 72,
    estado: 'Bueno',
    movimientos: 'Normal',
    parpadeo: 'Estable',
    notaTest: 85
  } : {
    // Datos para vista de estudiante
    nivelAtencion: 72,
    estado: 'Bueno',
    movimientos: 'Normal',
    parpadeo: 'Estable',
    retroalimentacion: 'Tu nivel de atención fue bueno durante la evaluación. Se detectaron algunos momentos de distracción en la parte final del test. Te recomendamos revisar el material complementario del módulo para reforzar los conceptos.'
  };

  const handleVolver = () => {
    if (esVistaDocente) {
      // Si es docente, volver al home de docente
      router.push('/home-docente');
    } else {
      // Si es estudiante, volver al curso
      router.push(`/curso/${cursoId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 ${esVistaDocente ? 'bg-green-600' : 'bg-blue-600'} rounded-lg flex items-center justify-center`}>
                <span className="text-2xl">{esVistaDocente ? '👨‍🏫' : '🎓'}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-800">
                Campus Virtual{esVistaDocente ? ' - Docente' : ''}
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

      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header de éxito */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-6xl">✅</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {esVistaDocente ? 'Análisis del Estudiante' : 'Test D2R Completado'}
          </h1>
          {esVistaDocente ? (
            <div className="space-y-1">
              <p className="text-xl font-semibold text-gray-700">{resultados.estudiante.nombre}</p>
              <p className="text-gray-600">{resultados.estudiante.email}</p>
              <p className="text-gray-600">{resultados.modulo} • {resultados.curso}</p>
              <p className="text-sm text-gray-500">📅 Evaluación del {resultados.fecha}</p>
            </div>
          ) : (
            <p className="text-gray-600">
              {modulo?.nombre} • {curso?.nombre}
            </p>
          )}
        </div>

        {/* Resultados */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="mr-3">📊</span>
            Resultados del Análisis de Atención
          </h2>

          {/* Nota del test (solo para docente) */}
          {esVistaDocente && (
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Calificación del Test D2R</p>
                  <p className="text-4xl font-bold text-blue-600">{resultados.notaTest}%</p>
                </div>
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">📝</span>
                </div>
              </div>
            </div>
          )}

          {/* Gráfico de nivel de atención */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Nivel de Atención General</span>
              <span className="text-2xl font-bold text-green-600">{resultados.nivelAtencion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-1000"
                style={{ width: `${resultados.nivelAtencion}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Estado: {resultados.estado}</p>
          </div>

          {/* Métricas detalladas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🎯</span>
                <div>
                  <p className="text-xs text-gray-600">Movimientos de cabeza</p>
                  <p className="text-lg font-bold text-gray-800">{resultados.movimientos}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">👀</span>
                <div>
                  <p className="text-xs text-gray-600">Frecuencia de parpadeo</p>
                  <p className="text-lg font-bold text-gray-800">{resultados.parpadeo}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Retroalimentación IA - Solo para estudiantes */}
          {!esVistaDocente && (
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                <span className="mr-2">🤖</span>
                Retroalimentación Personalizada
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {resultados.retroalimentacion}
              </p>
            </div>
          )}

          {/* Nota informativa para docente */}
          {esVistaDocente && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>ℹ️ Nota:</strong> Este análisis muestra el desempeño del estudiante durante la evaluación.
                La retroalimentación personalizada fue generada por IA y entregada directamente al estudiante.
              </p>
            </div>
          )}
        </div>

        {/* Acciones - Diferentes para docente y estudiante */}
        {!esVistaDocente ? (
          // Acciones para estudiante
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push(`/recomendaciones/${cursoId}/${moduloId}`)}
              className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-bold py-4 rounded-lg transition shadow-lg flex items-center justify-center space-x-2"
            >
              <span>⭐</span>
              <span>Ver Recomendaciones Personalizadas</span>
            </button>

            <button
              onClick={() => alert('Descarga de informe PDF (simulado en prototipo)')}
              className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-4 rounded-lg transition shadow-lg flex items-center justify-center space-x-2"
            >
              <span>📄</span>
              <span>Descargar Informe PDF</span>
            </button>
          </div>
        ) : (
          // Sin acciones adicionales para docente (no necesita recomendaciones ni descarga)
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-800">
              📋 Vista de supervisor - Los estudiantes reciben retroalimentación automática de la IA
            </p>
          </div>
        )}

        {/* Volver */}
        <div className="mt-8 text-center">
          <button
            onClick={handleVolver}
            className={`${esVistaDocente
              ? 'text-green-600 hover:text-green-800'
              : 'text-blue-600 hover:text-blue-800'
              } font-medium`}
          >
            ← {esVistaDocente ? 'Volver a lista de estudiantes' : 'Volver al curso'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultadosPage() {
  return (
    <AuthGuard>
      <ResultadosTest />
    </AuthGuard>
  );
}
