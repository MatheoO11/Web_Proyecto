// pages/estudiante/recurso/[id].js
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import AuthGuard from '../../../components/AuthGuard';
import TestD2R from '../../../components/views/estudiante/TestD2R';
import Video from '../../../components/views/estudiante/video';
import SmartVideo from '../../../components/views/estudiante/SmartVideo';
import { API_URL } from '@/config/api';

function RecursoDetalle() {
  const router = useRouter();
  const { id } = router.query;
  const { user, token, logout } = useAuth();

  const [recurso, setRecurso] = useState(null);
  const [cursoId, setCursoId] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ control cámara SOLO para video
  const [isRecording, setIsRecording] = useState(false);

  const [finalizeKey, setFinalizeKey] = useState(0);

  useEffect(() => {
    if (!router.isReady || !id || !token) return;

    const fetchData = async () => {
      try {
        const resRecurso = await fetch(`${API_URL}/api/recursos/${id}/`, {
          headers: { 'Authorization': `Token ${token}` }
        });

        if (!resRecurso.ok) {
          console.error("Recurso no encontrado");
          setRecurso(null);
          return;
        }

        const dataRecurso = await resRecurso.json();
        setRecurso(dataRecurso);

        // curso a través del módulo
        if (dataRecurso.modulo) {
          const resModulo = await fetch(`${API_URL}/api/modulos/${dataRecurso.modulo}/`, {
            headers: { 'Authorization': `Token ${token}` }
          });
          if (resModulo.ok) {
            const dataModulo = await resModulo.json();
            if (dataModulo.curso) setCursoId(dataModulo.curso);
          }
        }
      } catch (err) {
        console.error("Error de conexión:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router.isReady, token]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleTestFinished = (resultados) => {
    alert(`¡Test finalizado!\nTu nivel de concentración (CON): ${resultados.con}`);
    if (cursoId) router.push(`/estudiante/curso/${cursoId}`);
    else router.back();
  };

  // video <-> cámara
  const handleVideoStart = () => setIsRecording(true);
  const handleVideoPause = () => setTimeout(() => setIsRecording(false), 200);
  const handleVideoEnded = () => {
    setTimeout(() => setIsRecording(false), 200);
    setFinalizeKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      </div>
    );
  }

  if (!recurso) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <p className="text-xl">Recurso no encontrado o no tienes acceso.</p>
        <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">Volver</button>
      </div>
    );
  }

  const esVideo = recurso.tipo === 'video';
  const esLectura = recurso.tipo === 'lectura';
  const esTest = recurso.tipo === 'quiz';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800 font-medium transition"
              >
                ← Volver
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-800">Campus Virtual</h1>
            </div>
            <button onClick={handleLogout} className="text-red-600 font-medium">Salir</button>
          </div>
        </div>
      </nav>

      {/* ✅ ELIMINADO: Banner rojo de monitoreo D2-R */}
      {/* ✅ ELIMINADO: Banner azul de monitoreo de atención */}

      {esTest && (
        <div className="w-full max-w-6xl mx-auto px-4 mt-6">
          <TestD2R
            cursoId={cursoId}
            recursoId={recurso.id}
            onFinished={handleTestFinished}
          />
        </div>
      )}

      {/* ✅ Solo mostramos el contenido principal si NO es test (para evitar duplicar info) */}
      {!esTest && (
        <main className="max-w-6xl mx-auto px-4 py-8">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{recurso.titulo}</h1>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-8">
            <section className="space-y-4">
              {esVideo && (
                <div className="w-full">
                  {recurso.url_contenido ? (
                    <SmartVideo
                      videoUrl={recurso.url_contenido}
                      checkpoints={recurso.preguntas || []}
                      onVideoStart={handleVideoStart}
                      onVideoPause={handleVideoPause}
                      onVideoEnded={handleVideoEnded}
                    />
                  ) : (
                    <div className="aspect-video bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 border border-dashed border-gray-400">
                      <p>⚠️ El profesor no ha subido el enlace del video aún.</p>
                    </div>
                  )}
                </div>
              )}

              {esLectura && (
                <article className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
                  <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                    {recurso.contenido_texto || "Sin contenido de lectura."}
                  </div>
                </article>
              )}
            </section>

            <aside className="space-y-4">
              {/* ✅ ELIMINADO: Tarjeta de "Información" con Tipo y Duración */}

              {/* ✅ CÁMARA SOLO SI ES VIDEO */}
              {esVideo && (
                <div className="space-y-2 sticky top-24">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-gray-500 uppercase">Tu Cámara</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {isRecording ? 'REC ●' : 'STANDBY'}
                    </span>
                  </div>

                  <Video isRecording={isRecording} recursoId={recurso.id} finalizeKey={finalizeKey} />

                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-sm p-4 border border-purple-100 mt-2">
                    <h3 className="text-xs font-bold text-purple-900 mb-2 flex items-center">
                      <span className="mr-2">🧠</span>
                      Análisis en Tiempo Real
                    </h3>
                    <p className="text-[10px] text-purple-700 leading-relaxed text-center">
                      El análisis se activa automáticamente al reproducir el video.
                    </p>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </main>
      )}
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
