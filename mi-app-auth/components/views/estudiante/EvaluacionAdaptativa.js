// components/views/estudiante/EvaluacionAdaptativa.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '@/config/api';

export default function EvaluacionAdaptativa({ recursoId = null, onClose }) {
  const { token } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [evaluacion, setEvaluacion] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [tiempoInicio, setTiempoInicio] = useState(null);
  const [error, setError] = useState(null);

  // ✅ Cambia esta frase como quieras
  const FRASE_FALLBACK_IA = '📌 Evaluación generada automáticamente.';

  useEffect(() => {
    if (!token) return;
    setTiempoInicio(Date.now());
    generarEvaluacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const generarEvaluacion = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/courses/generar-evaluacion/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recurso_id: recursoId }),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error('Error generar-evaluacion:', res.status, txt);
        setError('Error al generar evaluación.');
        return;
      }

      const data = await res.json();
      setEvaluacion(data?.evaluacion || null);
      setRespuestas({});
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleRespuesta = (preguntaIndex, opcionLetra) => {
    setRespuestas((prev) => ({
      ...prev,
      [preguntaIndex]: opcionLetra,
    }));
  };

  const enviarRespuestas = async () => {
    if (!evaluacion) return;

    const preguntas = evaluacion.preguntas || [];
    const totalPreguntas = preguntas.length;
    const totalRespuestas = Object.keys(respuestas).length;

    if (totalRespuestas < totalPreguntas) {
      alert(`Debes responder todas las preguntas (${totalRespuestas}/${totalPreguntas})`);
      return;
    }

    setEnviando(true);
    setError(null);

    const tiempoInvertido = tiempoInicio ? Math.floor((Date.now() - tiempoInicio) / 1000) : 0;
    const respuestasArray = preguntas.map((_, index) => respuestas[index]);

    try {
      const res = await fetch(`${API_URL}/api/courses/enviar-respuestas/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluacion_id: evaluacion.id,
          respuestas: respuestasArray,
          tiempo_invertido: tiempoInvertido,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error('Error enviar-respuestas:', res.status, txt);
        setError('Error al enviar respuestas.');
        return;
      }

      const data = await res.json();
      setResultado(data);
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión.');
    } finally {
      setEnviando(false);
    }
  };

  const cerrar = (shouldRefresh = false) => {
    if (onClose) onClose(shouldRefresh);
    else router.push('/estudiante');
  };

  // =========================
  // RENDER
  // =========================

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-800">Generando tu evaluación...</p>
          <p className="text-sm text-gray-500 mt-2">Preparando preguntas según tu perfil</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full">
          <h3 className="text-xl font-bold text-gray-800 mb-2">⚠️ Ocurrió un problema</h3>
          <p className="text-gray-600 text-sm mb-6">{error}</p>

          <div className="flex gap-3">
            <button
              onClick={() => cerrar(false)}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                setTiempoInicio(Date.now());
                generarEvaluacion();
              }}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RESULTADO
  if (resultado) {
    const aciertos = resultado.aciertos ?? 0;
    const total = resultado.total ?? 0;
    const porcentaje = resultado.porcentaje ?? 0;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl p-8 max-w-2xl w-full my-8">
          <div
            className={`text-center mb-6 p-6 rounded-xl ${resultado.aprobado ? 'bg-green-100' : 'bg-yellow-100'
              }`}
          >
            <div className="text-6xl mb-3">{resultado.aprobado ? '🎉' : '📚'}</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {resultado.aprobado ? '¡Felicitaciones!' : '¡Sigue practicando!'}
            </h2>
            <p className="text-xl font-semibold">
              Puntaje: {aciertos}/{total}
            </p>
            <p className="text-sm text-gray-600 mt-1">({porcentaje}% de aciertos)</p>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">🤖 Análisis</h3>
            <p className="text-blue-800 text-sm leading-relaxed">{resultado.mensaje_ia}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => cerrar(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
            >
              Ver Dashboard Actualizado
            </button>

            {!resultado.aprobado && (
              <button
                onClick={() => {
                  setResultado(null);
                  setRespuestas({});
                  setTiempoInicio(Date.now());
                  generarEvaluacion();
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition"
              >
                Reintentar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!evaluacion) return null;

  const nivel = evaluacion.nivel ?? 'N/A';
  const preguntas = evaluacion.preguntas ?? [];
  const mensajeIA =
    evaluacion?.contexto_atencion?.mensaje
      ? (
        String(evaluacion.contexto_atencion.mensaje).includes('(Sin IA)')
          ? FRASE_FALLBACK_IA
          : evaluacion.contexto_atencion.mensaje
      )
      : null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      {/* ✅ Caja del modal con altura limitada */}
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl">
        {/* ✅ Contenedor interno con scroll (NO necesitas achicar ventana) */}
        <div className="max-h-[90vh] overflow-y-auto p-8">
          {/* HEADER */}
          <div className="mb-6 border-b pb-4 sticky top-0 bg-white z-10">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Evaluación Adaptativa</h2>
                <p className="text-sm text-gray-600">
                  Nivel: <span className="font-semibold">{nivel}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-semibold">
                  {preguntas.length} preguntas
                </div>
              </div>
            </div>

            {/* MENSAJE IA */}
            {mensajeIA && (
              <div className="mt-4 bg-purple-50 border-l-4 border-purple-500 p-3 rounded-lg">
                <p className="text-purple-900 text-sm">
                  <span className="font-bold">🤖 Nota:</span> {mensajeIA}
                </p>
              </div>
            )}
          </div>

          {/* PREGUNTAS */}
          <div className="space-y-6 mb-6">
            {preguntas.map((pregunta, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <p className="font-semibold text-gray-800 mb-3">
                  {index + 1}. {pregunta.pregunta}
                </p>

                <div className="space-y-2">
                  {(pregunta.opciones || []).map((opcion, opIndex) => {
                    const letra = String.fromCharCode(65 + opIndex);
                    const isSelected = respuestas[index] === letra;

                    return (
                      <button
                        key={opIndex}
                        onClick={() => handleRespuesta(index, letra)}
                        className={`w-full text-left p-3 rounded-lg transition border-2 ${isSelected
                            ? 'bg-blue-100 border-blue-500 text-blue-900'
                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                      >
                        <span className="font-bold mr-2">{letra}.</span>
                        {opcion}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* FOOTER (sticky) */}
          <div className="sticky bottom-0 bg-white pt-4 border-t z-10">
            <div className="flex gap-3">
              <button
                onClick={() => cerrar(false)}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
              >
                Cancelar
              </button>

              <button
                onClick={enviarRespuestas}
                disabled={enviando || Object.keys(respuestas).length < preguntas.length}
                className={`flex-1 py-3 rounded-lg font-bold transition ${enviando || Object.keys(respuestas).length < preguntas.length
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
              >
                {enviando ? 'Enviando...' : 'Enviar Respuestas'}
              </button>
            </div>

            <div className="mt-3 text-center text-sm text-gray-500">
              Respondidas: {Object.keys(respuestas).length}/{preguntas.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
