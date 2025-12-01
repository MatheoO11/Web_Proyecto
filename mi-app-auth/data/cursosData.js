// data/cursosData.js

export const cursosData = {
  3: { // ID del curso como Key
    id: 3,
    nombre: 'Base de Datos',
    icon: '🗄️',
    descripcion: 'Aprende los fundamentos de bases de datos relacionales, SQL y diseño de sistemas de información.',
    profesor: 'Dr. Carlos Mendoza',
    progreso: 45, // Esto normalmente vendría del UserData, pero para prototipo está bien aquí
    duracion: '12 semanas',
    estudiantes: 156,
    color: 'green', // Agregado para UI
    modulos: {
      1: {
        id: 1,
        nombre: 'Módulo 1: Introducción a Bases de Datos',
        descripcion: 'Conceptos fundamentales y primeros pasos',
        recursos: [
          {
            id: '1-1',
            tipo: 'video',
            titulo: 'Conceptos básicos de BD',
            descripcion: 'Video introductorio a los conceptos clave de una base de datos.',
            duracion: '15:00',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' // URL de ejemplo válida
          },
          {
            id: '1-2',
            tipo: 'lectura',
            titulo: 'Historia de las bases de datos',
            descripcion: 'Lectura guiada sobre la evolución histórica.',
            duracion: '10 min',
            contenido: `Antes de que existieran las bases de datos modernas...`
          },
          {
            id: '1-3',
            tipo: 'quiz',
            titulo: 'Test: D2R',
            descripcion: 'Evaluación obligatoria para el Módulo 1.',
            duracion: '5 min',
            esObligatorio: true,
            preguntas: [
              {
                id: 1,
                pregunta: '¿Qué es una base de datos?',
                opciones: ['Colección de datos', 'Un archivo Excel', 'Internet', 'Ninguna'],
                respuesta: 'Colección de datos'
              }
            ]
          }
        ],
        recomendaciones: [
          {
            id: 'r1-1',
            tipo: 'video',
            titulo: 'Tutorial: Instalación de PostgreSQL',
            descripcion: 'Aprende a instalar y configurar PostgreSQL',
            duracion: '12:30',
            nivel: 'Principiante',
            fuente: 'YouTube - DatabasePro'
          }
        ]
      },
      2: {
        id: 2,
        nombre: 'Módulo 2: Modelo Relacional',
        descripcion: 'Tablas, relaciones y normalización',
        recursos: [
          {
            id: '2-1',
            tipo: 'video',
            titulo: 'Tablas y relaciones',
            descripcion: 'Estructura de tablas y FK/PK.',
            duracion: '22:15'
          }
        ],
        recomendaciones: []
      },
      3: {
        id: 3,
        nombre: 'Módulo 3: SQL Básico',
        descripcion: 'Consultas, filtros y operaciones básicas',
        recursos: [
          { id: '3-1', tipo: 'video', titulo: 'SELECT y WHERE', duracion: '20:00' }
        ],
        recomendaciones: []
      }
    }
  }
};

/* --- HELPER FUNCTIONS (Simulan una API) --- */

// 1. Obtener todos los cursos (Para el Dashboard)
export function getAllCursos() {
  return Object.values(cursosData);
}

// 2. Obtener un curso por ID (Para la página del curso)
export function getCurso(cursoId) {
  // Convertimos a número porque las URLs traen strings "3"
  return cursosData[Number(cursoId)] || null;
}

// 3. Obtener un módulo específico
export function getModulo(cursoId, moduloId) {
  const curso = getCurso(cursoId);
  if (!curso) return null;

  return curso.modulos[Number(moduloId)] || null;
}

// 4. Obtener un recurso específico
export function getRecurso(cursoId, moduloId, recursoId) {
  const modulo = getModulo(cursoId, moduloId);
  if (!modulo) return null;

  return modulo.recursos.find(r => r.id === recursoId) || null;
}

// 5. Obtener recomendaciones
export function getRecomendaciones(cursoId, moduloId) {
  const modulo = getModulo(cursoId, moduloId);
  return modulo?.recomendaciones || [];
}
