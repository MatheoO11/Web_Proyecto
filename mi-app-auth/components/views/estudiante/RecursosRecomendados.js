// components/views/estudiante/RecursosRecomendados.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '@/config/api';

export default function RecursosRecomendados() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recursos, setRecursos] = useState([]);
  const [nivelAtencion, setNivelAtencion] = useState(null);

  useEffect(() => {
    fetchRecursos();
  }, [token]);

  const fetchRecursos = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/recursos-recomendados/`, {
        headers: { 'Authorization': `Token ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setRecursos(data.recursos || []);
        setNivelAtencion(data.nivel_atencion || null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoVisto = async (recursoId) => {
    try {
      const res = await fetch(`${API_URL}/api/marcar-recurso-visto/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recurso_id: recursoId })
      });

      if (res.ok) {
        // Actualizar localmente
        setRecursos(recursos.map(r =>
          r.id === recursoId ? { ...r, visto: true } : r
        ));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const abrirRecurso = (recurso) => {
    if (recurso.url) {
      window.open(recurso.url, '_blank');
      if (!recurso.visto) {
        marcarComoVisto(recurso.id);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!recursos || recursos.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Sin recursos recomendados aún
        </h3>
        <p className="text-gray-600">
          Completa evaluaciones y ve videos para recibir recomendaciones personalizadas.
        </p>
      </div>
    );
  }

  // Iconos por tipo de recurso
  const iconosPorTipo = {
    'video': '🎥',
    'lectura': '📄',
    'ejercicio': '✏️',
    'tutorial': '🎓',
    'podcast': '🎧',
    'infografia': '📊'
  };

  // Colores por prioridad
  const coloresPrioridad = {
    'alta': 'border-red-400 bg-red-50',
    'media': 'border-yellow-400 bg-yellow-50',
    'baja': 'border-green-400 bg-green-50'
  };

  // Mensaje según nivel de atención
  const mensajeNivel = {
    'baja': {
      icono: '🔴',
      titulo: 'Refuerzo Intensivo',
      descripcion: 'Tu nivel de atención ha sido bajo. Estos recursos te ayudarán a mejorar.',
      cantidad: recursos.length
    },
    'media': {
      icono: '🟡',
      titulo: 'Refuerzo Moderado',
      descripcion: 'Estás en buen camino. Estos recursos complementarán tu aprendizaje.',
      cantidad: recursos.length
    },
    'alta': {
      icono: '🟢',
      titulo: 'Contenido Complementario',
      descripcion: '¡Excelente atención! Aquí tienes recursos adicionales para profundizar.',
      cantidad: recursos.length
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER CON NIVEL DE ATENCIÓN */}
      {nivelAtencion && mensajeNivel[nivelAtencion] && (
        <div className={`rounded-xl shadow-md p-6 ${nivelAtencion === 'baja' ? 'bg-gradient-to-r from-red-500 to-pink-600' :
            nivelAtencion === 'media' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
              'bg-gradient-to-r from-green-500 to-teal-600'
          } text-white`}>
          <div className="flex items-start gap-4">
            <div className="text-5xl">
              {mensajeNivel[nivelAtencion].icono}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">
                {mensajeNivel[nivelAtencion].titulo}
              </h2>
              <p className="text-sm opacity-90 mb-3">
                {mensajeNivel[nivelAtencion].descripcion}
              </p>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
                <span className="font-semibold">
                  {mensajeNivel[nivelAtencion].cantidad} recurso{mensajeNivel[nivelAtencion].cantidad !== 1 ? 's' : ''} recomendado{mensajeNivel[nivelAtencion].cantidad !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LISTA DE RECURSOS */}
      <div className="grid grid-cols-1 gap-4">
        {recursos.map((recurso, index) => (
          <div
            key={recurso.id || index}
            className={`bg-white rounded-xl shadow-md border-l-4 overflow-hidden transition-all hover:shadow-lg ${coloresPrioridad[recurso.prioridad] || 'border-gray-400 bg-gray-50'
              }`}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* ICONO */}
                <div className="text-5xl">
                  {iconosPorTipo[recurso.tipo] || '📌'}
                </div>

                {/* CONTENIDO */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-800 text-lg">
                      {recurso.titulo}
                    </h3>
                    {recurso.visto && (
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                        ✓ Visto
                      </span>
                    )}
                  </div>

                  <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                    {recurso.descripcion}
                  </p>

                  {/* METADATA */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {recurso.tipo.charAt(0).toUpperCase() + recurso.tipo.slice(1)}
                    </span>
                    <span className={`px-2 py-1 rounded font-semibold ${recurso.prioridad === 'alta' ? 'bg-red-100 text-red-700' :
                        recurso.prioridad === 'media' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                      }`}>
                      Prioridad: {recurso.prioridad}
                    </span>
                    {recurso.tema && (
                      <span>🏷️ {recurso.tema}</span>
                    )}
                  </div>

                  {/* BOTÓN */}
                  {recurso.url ? (
                    <button
                      onClick={() => abrirRecurso(recurso)}
                      className={`w-full py-2 px-4 rounded-lg font-semibold transition ${recurso.visto
                          ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                      {recurso.visto ? 'Ver de nuevo' : 'Abrir recurso'} →
                    </button>
                  ) : (
                    <div className="text-center py-2 text-gray-500 text-sm italic">
                      Próximamente disponible
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER CON RAZÓN DE RECOMENDACIÓN */}
            {recurso.razon_recomendacion && (
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">🤖 IA:</span> {recurso.razon_recomendacion}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-semibold text-blue-900 mb-1">
              Tip: Aprovecha estos recursos
            </p>
            <p className="text-sm text-blue-800">
              {nivelAtencion === 'baja'
                ? 'Tu nivel de atención indica que necesitas refuerzo. Dedica al menos 30 minutos diarios a estos materiales.'
                : nivelAtencion === 'media'
                  ? 'Complementa tus videos con estos recursos para fortalecer conceptos clave.'
                  : 'Estos recursos te ayudarán a profundizar y dominar los temas avanzados.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
