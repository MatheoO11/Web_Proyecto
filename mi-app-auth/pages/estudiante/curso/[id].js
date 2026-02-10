import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '@/config/api';

function CursoMenu() {
  const router = useRouter();
  const { id } = router.query; // ID del curso en la base de datos
  const { token } = useAuth();

  const [curso, setCurso] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Esperamos a que el router y el token estén listos
    if (!router.isReady || !id || !token) return;

    const fetchDetallesCurso = async () => {
      try {
        // Petición a tu API Django
        const res = await fetch(`${API_URL}/api/cursos/${id}/`, {
          headers: { 'Authorization': `Token ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setCurso(data);
        } else {
          console.error("Error al obtener el curso");
        }
      } catch (err) {
        console.error("Error de conexión:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetallesCurso();
  }, [id, router.isReady, token]);

  const irARecurso = (recursoId) => {
    // Usamos el ID real de la base de datos para navegar
    router.push(`/estudiante/recurso/${recursoId}`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!curso) return (
    <Layout>
      <div className="p-20 text-center">
        <h2 className="text-2xl font-bold text-gray-700">Curso no encontrado 😢</h2>
        <button onClick={() => router.push('/estudiante')} className="text-blue-600 mt-4">Volver</button>
      </div>
    </Layout>
  );

  return (
    <Layout>
      {/* Encabezado del Curso */}
      <div className="bg-blue-600 text-white py-12 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/estudiante')}
            className="text-blue-200 hover:text-white mb-4 flex items-center transition"
          >
            ← Volver al Dashboard
          </button>
          <div className="flex items-center space-x-4">
            <span className="text-5xl">{curso.icon || '📘'}</span>
            <div>
              <h1 className="text-4xl font-bold">{curso.nombre}</h1>
              <p className="text-blue-100 mt-2">{curso.descripcion}</p>
              <div className="mt-4 inline-block bg-blue-700/50 px-4 py-1 rounded-lg text-sm font-semibold border border-blue-500/30">
                Profesor: {curso.nombre_profesor}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Módulos y Recursos */}
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {curso.modulos && curso.modulos.length > 0 ? (
          curso.modulos.map((modulo) => (
            <div key={modulo.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">{modulo.nombre}</h3>
              </div>

              <div className="divide-y divide-gray-50">
                {modulo.recursos && modulo.recursos.length > 0 ? (
                  modulo.recursos.map((recurso) => (
                    <div
                      key={recurso.id}
                      className="px-6 py-4 flex justify-between items-center hover:bg-blue-50 cursor-pointer transition group"
                      onClick={() => irARecurso(recurso.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm
                                ${recurso.tipo === 'video' ? 'bg-red-100 text-red-600' :
                            recurso.tipo === 'quiz' ? 'bg-purple-100 text-purple-600' :
                              'bg-blue-100 text-blue-600'}`
                        }>
                          {recurso.tipo === 'video' && '▶️'}
                          {recurso.tipo === 'lectura' && '📄'}
                          {recurso.tipo === 'quiz' && '🧠'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-blue-700 transition">
                            {recurso.titulo}
                          </p>
                          <p className="text-xs text-gray-500 uppercase">
                            {recurso.tipo} • {recurso.duracion_estimada || '10 min'}
                          </p>
                        </div>
                      </div>
                      <span className="text-gray-300 group-hover:text-blue-500 transition text-xl">→</span>
                    </div>
                  ))
                ) : (
                  <p className="p-6 text-sm text-gray-400 italic text-center">Este módulo aún no tiene contenido.</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">Este curso aún no tiene módulos publicados.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function CursoPage() {
  return (
    <AuthGuard allowedRoles={['estudiante']}>
      <CursoMenu />
    </AuthGuard>
  );
}
