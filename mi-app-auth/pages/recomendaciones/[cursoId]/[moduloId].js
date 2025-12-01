import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import AuthGuard from '../../../components/AuthGuard';

function RecomendacionesModulo() {
  const router = useRouter();
  const { cursoId, moduloId } = router.query;
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Datos de recomendaciones por módulo
  const recomendacionesData = {
    3: { // Curso Base de Datos
      nombre: 'Base de Datos',
      icon: '🗄️',
      modulos: {
        1: {
          nombre: 'Módulo 1: Introducción a Bases de Datos',
          descripcion: 'Conceptos fundamentales y primeros pasos',
          recomendaciones: [
            {
              id: 1,
              tipo: 'video',
              titulo: 'Tutorial: Instalación de PostgreSQL',
              descripcion: 'Aprende a instalar y configurar PostgreSQL en Windows, Mac y Linux',
              duracion: '12:30',
              nivel: 'Principiante',
              fuente: 'YouTube - DatabasePro'
            },
            {
              id: 2,
              tipo: 'articulo',
              titulo: 'Guía: Tipos de Bases de Datos',
              descripcion: 'Comparativa entre bases de datos relacionales y NoSQL',
              duracion: '8 min lectura',
              nivel: 'Principiante',
              fuente: 'Medium - Tech Articles'
            },
            {
              id: 3,
              tipo: 'libro',
              titulo: 'Fundamentos de Bases de Datos - Capítulo 1',
              descripcion: 'Lectura complementaria sobre historia y evolución de las BD',
              duracion: '25 min lectura',
              nivel: 'Principiante',
              fuente: 'Editorial TechBooks'
            },
            {
              id: 4,
              tipo: 'practica',
              titulo: 'Ejercicio: Dibuja un diagrama ER',
              descripcion: 'Práctica de modelado de entidad-relación básico',
              duracion: '30 min',
              nivel: 'Principiante',
              fuente: 'Campus Virtual'
            },
            {
              id: 5,
              tipo: 'herramienta',
              titulo: 'Herramienta: DB Diagram Designer',
              descripcion: 'Software gratuito para diseñar diagramas de bases de datos',
              duracion: 'Variable',
              nivel: 'Todos',
              fuente: 'dbdiagram.io'
            }
          ]
        },
        2: {
          nombre: 'Módulo 2: Modelo Relacional',
          descripcion: 'Tablas, relaciones y normalización',
          recomendaciones: [
            {
              id: 6,
              tipo: 'video',
              titulo: 'Normalización de Bases de Datos Explicada',
              descripcion: '1NF, 2NF, 3NF y BCNF con ejemplos prácticos',
              duracion: '18:45',
              nivel: 'Intermedio',
              fuente: 'YouTube - CodeMaster'
            },
            {
              id: 7,
              tipo: 'articulo',
              titulo: 'Claves Primarias vs Claves Foráneas',
              descripcion: 'Diferencias, uso y mejores prácticas',
              duracion: '10 min lectura',
              nivel: 'Intermedio',
              fuente: 'Dev.to - Database Corner'
            },
            {
              id: 8,
              tipo: 'video',
              titulo: 'Tipos de Relaciones: 1:1, 1:N, N:M',
              descripcion: 'Cómo identificar y modelar diferentes tipos de relaciones',
              duracion: '15:20',
              nivel: 'Intermedio',
              fuente: 'YouTube - DB Academy'
            },
            {
              id: 9,
              tipo: 'practica',
              titulo: 'Proyecto: Sistema de Biblioteca',
              descripcion: 'Diseña el modelo relacional completo de una biblioteca',
              duracion: '60 min',
              nivel: 'Intermedio',
              fuente: 'Campus Virtual'
            },
            {
              id: 10,
              tipo: 'articulo',
              titulo: 'Índices: Cuándo y Cómo Usarlos',
              descripcion: 'Optimización de consultas con índices',
              duracion: '12 min lectura',
              nivel: 'Intermedio',
              fuente: 'PostgreSQL Wiki'
            },
            {
              id: 11,
              tipo: 'libro',
              titulo: 'Diseño de Bases de Datos - Capítulo 3',
              descripcion: 'Profundización en integridad referencial',
              duracion: '30 min lectura',
              nivel: 'Intermedio',
              fuente: 'Editorial TechBooks'
            },
            {
              id: 12,
              tipo: 'herramienta',
              titulo: 'MySQL Workbench',
              descripcion: 'Herramienta visual para diseño y modelado',
              duracion: 'Variable',
              nivel: 'Todos',
              fuente: 'MySQL Official'
            },
            {
              id: 13,
              tipo: 'quiz',
              titulo: 'Quiz: Normalización Interactivo',
              descripcion: 'Pon a prueba tus conocimientos sobre normalización',
              duracion: '15 min',
              nivel: 'Intermedio',
              fuente: 'Campus Virtual'
            }
          ]
        },
        3: {
          nombre: 'Módulo 3: SQL Básico',
          descripcion: 'Consultas, filtros y operaciones básicas',
          recomendaciones: [
            {
              id: 14,
              tipo: 'video',
              titulo: 'SQL en 60 Minutos - Curso Completo',
              descripcion: 'Tutorial intensivo de SQL desde cero',
              duracion: '60:00',
              nivel: 'Principiante',
              fuente: 'YouTube - FreeCodeCamp'
            },
            {
              id: 15,
              tipo: 'practica',
              titulo: 'SQL Zoo - Ejercicios Interactivos',
              descripcion: 'Plataforma con ejercicios progresivos de SQL',
              duracion: 'Variable',
              nivel: 'Principiante',
              fuente: 'sqlzoo.net'
            },
            {
              id: 16,
              tipo: 'articulo',
              titulo: 'Guía Completa de JOINs en SQL',
              descripcion: 'INNER, LEFT, RIGHT, FULL OUTER JOIN explicados',
              duracion: '15 min lectura',
              nivel: 'Intermedio',
              fuente: 'W3Schools'
            },
            {
              id: 17,
              tipo: 'video',
              titulo: 'Subconsultas y Consultas Anidadas',
              descripcion: 'Cómo escribir consultas dentro de consultas',
              duracion: '22:10',
              nivel: 'Intermedio',
              fuente: 'YouTube - SQL Master'
            },
            {
              id: 18,
              tipo: 'herramienta',
              titulo: 'DB Fiddle',
              descripcion: 'Editor SQL online para practicar sin instalación',
              duracion: 'Variable',
              nivel: 'Todos',
              fuente: 'dbfiddle.uk'
            },
            {
              id: 19,
              tipo: 'practica',
              titulo: 'HackerRank SQL Challenges',
              descripcion: 'Desafíos de SQL de diferentes niveles',
              duracion: 'Variable',
              nivel: 'Todos',
              fuente: 'HackerRank'
            }
          ]
        }
      }
    }
  };

  const cursoData = recomendacionesData[cursoId];
  const moduloData = cursoData?.modulos[moduloId];

  if (!moduloData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'video': return '🎬';
      case 'articulo': return '📰';
      case 'libro': return '📚';
      case 'practica': return '💻';
      case 'herramienta': return '🔧';
      case 'quiz': return '❓';
      default: return '📄';
    }
  };

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'video': return 'from-red-500 to-pink-600';
      case 'articulo': return 'from-blue-500 to-cyan-600';
      case 'libro': return 'from-green-500 to-emerald-600';
      case 'practica': return 'from-purple-500 to-indigo-600';
      case 'herramienta': return 'from-yellow-500 to-orange-600';
      case 'quiz': return 'from-pink-500 to-rose-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  const getNivelBadge = (nivel) => {
    const colors = {
      'Principiante': 'bg-green-100 text-green-700',
      'Intermedio': 'bg-yellow-100 text-yellow-700',
      'Avanzado': 'bg-red-100 text-red-700',
      'Todos': 'bg-blue-100 text-blue-700'
    };
    return colors[nivel] || colors['Todos'];
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
                ← Volver al Home
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

      {/* Hero del módulo */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center space-x-4 mb-4">
            <span className="text-6xl">{cursoData.icon}</span>
            <div>
              <p className="text-orange-100 text-sm font-semibold mb-1">{cursoData.nombre}</p>
              <h1 className="text-4xl font-bold">{moduloData.nombre}</h1>
              <p className="text-xl text-orange-100 mt-2">{moduloData.descripcion}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 mt-6">
            <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-semibold">
              {moduloData.recomendaciones.length} recomendaciones
            </span>
          </div>
        </div>
      </div>

      {/* Contenido de recomendaciones */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">📚 Material Recomendado</h2>
          <p className="text-gray-600">Recursos adicionales para complementar tu aprendizaje</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {moduloData.recomendaciones.map((rec) => (
            <div key={rec.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden">
              {/* Header de la card */}
              <div className={`h-3 bg-gradient-to-r ${getTipoColor(rec.tipo)}`}></div>

              <div className="p-6">
                {/* Tipo y nivel */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-3xl">{getTipoIcon(rec.tipo)}</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full uppercase">
                      {rec.tipo}
                    </span>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getNivelBadge(rec.nivel)}`}>
                    {rec.nivel}
                  </span>
                </div>

                {/* Título y descripción */}
                <h3 className="text-lg font-bold text-gray-800 mb-2">{rec.titulo}</h3>
                <p className="text-sm text-gray-600 mb-4">{rec.descripcion}</p>

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span className="flex items-center">
                    <span className="mr-1">⏱️</span>
                    {rec.duracion}
                  </span>
                  <span className="flex items-center">
                    <span className="mr-1">📍</span>
                    {rec.fuente}
                  </span>
                </div>

                {/* Botón */}
                <button className={`w-full bg-gradient-to-r ${getTipoColor(rec.tipo)} hover:opacity-90 text-white font-semibold py-3 rounded-lg transition`}>
                  {rec.tipo === 'video' ? '▶️ Ver video' :
                    rec.tipo === 'practica' ? '💻 Iniciar práctica' :
                      rec.tipo === 'herramienta' ? '🔧 Usar herramienta' :
                        '📖 Acceder'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Botón volver */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/home')}
            className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-3 rounded-lg transition font-medium"
          >
            ← Volver a Recomendaciones
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecomendacionesPage() {
  return (
    <AuthGuard>
      <RecomendacionesModulo />
    </AuthGuard>
  );
}
