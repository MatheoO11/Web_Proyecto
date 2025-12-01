import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import AuthGuard from '../../../components/AuthGuard';
import { cursosData } from '../../../data/cursosData';
// Importamos tu componente del Test D2R
import TestD2R from '../../../components/views/estudiante/TestD2R';

function RecursoDetalle() {
  const router = useRouter();
  const { id } = router.query;
  const { user, logout } = useAuth();

  // Parse el ID compuesto: "cursoId-moduloId-recursoId"
  const [cursoId, moduloId, recursoId] = (id || '').split('-');

  const curso = cursosData[cursoId];
  const modulo = curso?.modulos[moduloId];
  const recurso = modulo?.recursos.find(r => r.id === `${moduloId}-${recursoId}`);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!recurso || !curso || !modulo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Cargando recurso...</div>
      </div>
    );
  }

  // Identificamos el tipo de recurso
  const esVideo = recurso.tipo === 'video';
  const esLectura = recurso.tipo === 'lectura';
  // Aceptamos 'quiz' (tu data) o 'd2r' como Test
  const esTest = recurso.tipo === 'quiz' || recurso.tipo === 'd2r';

  const handleTestFinished = (resultados) => {
    // Aquí puedes guardar los resultados en el futuro
    alert(`¡Test finalizado! Efectividad: ${resultados.efectividad}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                // Al volver, regresamos al menú del curso
                onClick={() => router.push(`/estudiante/curso/${cursoId}`)}
                className="text-gray-600 hover:text-gray-800 font-medium transition"
              >
                ← Volver al curso
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-800">Campus Virtual</h1>
            </div>
            <button onClick={handleLogout} className="text-red-600 font-medium">Salir</button>
          </div>
        </div>
      </nav>

      {/* Banner de Monitoreo */}
      {esTest ? (
        <div className="bg-red-50 border-l-4 border-red-500 mx-auto max-w-6xl px-4 py-4 mt-6">
          <p className="text-red-800 font-bold">🔴 EVALUACIÓN EN PROCESO - Monitoreo activo</p>
        </div>
      ) : (
        <div className="bg-blue-50 border-l-4 border-blue-500 mx-auto max-w-6xl px-4 py-3 mt-6">
          <p className="text-blue-800 font-bold">📹 Monitoreo de atención activo</p>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-6">
          <p className="text-xs uppercase text-green-600 font-semibold mb-1">
            {curso.nombre} • {modulo.nombre}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{recurso.titulo}</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-8">

          {/* IZQUIERDA: VIDEO / LECTURA / TEST */}
          <section className="space-y-4">

            {esVideo && (
              <div className="aspect-video w-full bg-gray-900 rounded-xl flex items-center justify-center text-white">
                <p>Reproductor de Video (Pronto)</p>
              </div>
            )}

            {esLectura && (
              <article className="bg-white p-8 rounded-xl shadow-md">
                <div className="whitespace-pre-line">{recurso.contenido}</div>
              </article>
            )}

            {/* ✅ AQUÍ SE MUESTRA EL TEST D2R */}
            {esTest && (
              <div className="w-full">
                <TestD2R onFinished={handleTestFinished} />
              </div>
            )}

          </section>

          {/* DERECHA: INFORMACIÓN */}
          <aside className="space-y-4">
            <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
              <h3 className="font-bold mb-3">Información</h3>
              <p className="text-sm">Tipo: {recurso.tipo}</p>
              <p className="text-sm">Duración: {recurso.duracion}</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function RecursoPage() {
  return (
    <AuthGuard allowedRoles={['estudiante']}>
      <RecursoDetalle />
    </AuthGuard>
  );
}
