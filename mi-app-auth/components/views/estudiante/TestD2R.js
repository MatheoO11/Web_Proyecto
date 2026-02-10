import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../common/Button';
import { API_URL } from '@/config/api';

export default function TestD2R({ cursoId, recursoId, onFinished }) {
  const { token } = useAuth();

  const CONFIG = {
    TOTAL_FILAS: 14,
    ITEMS_POR_FILA: 57,
    TIEMPO_POR_FILA: 20,
  };

  const [estado, setEstado] = useState('instrucciones');
  const [filaActual, setFilaActual] = useState(0);
  const [tiempoRestante, setTiempoRestante] = useState(CONFIG.TIEMPO_POR_FILA);
  const [items, setItems] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [resultadosFinales, setResultadosFinales] = useState(null);
  const [errorEnvio, setErrorEnvio] = useState(null);

  const envioEnCursoRef = useRef(false);

  // --- 1. GENERADOR (Aleatorio cada vez) ---
  const generarTest = useCallback(() => {
    const nuevasFilas = [];
    for (let f = 0; f < CONFIG.TOTAL_FILAS; f++) {
      const fila = [];
      for (let c = 0; c < CONFIG.ITEMS_POR_FILA; c++) {
        const esD = Math.random() > 0.5;
        let letra = esD ? 'd' : 'p';
        const combinaciones = [
          { top: 0, bot: 0, total: 0 }, { top: 1, bot: 0, total: 1 }, { top: 0, bot: 1, total: 1 },
          { top: 2, bot: 0, total: 2 }, { top: 0, bot: 2, total: 2 }, { top: 1, bot: 1, total: 2 },
          { top: 2, bot: 1, total: 3 }, { top: 1, bot: 2, total: 3 }, { top: 2, bot: 2, total: 4 }
        ];
        const estilo = combinaciones[Math.floor(Math.random() * combinaciones.length)];
        const esObjetivo = letra === 'd' && estilo.total === 2;

        fila.push({ id: `${f}-${c}`, fila: f, col: c, letra, top: estilo.top, bot: estilo.bot, esObjetivo });
      }
      nuevasFilas.push(fila);
    }
    setItems(nuevasFilas);
  }, []);

  useEffect(() => { generarTest(); }, [generarTest]);

  const avanzarFila = () => {
    if (filaActual < CONFIG.TOTAL_FILAS - 1) {
      setFilaActual(prev => prev + 1);
      setTiempoRestante(CONFIG.TIEMPO_POR_FILA);
      window.scrollTo(0, 0);
    } else {
      finalizarTest();
    }
  };

  useEffect(() => {
    let intervalo = null;
    if (estado === 'test') {
      intervalo = setInterval(() => {
        setTiempoRestante((prev) => {
          if (prev <= 1) {
            avanzarFila();
            return CONFIG.TIEMPO_POR_FILA;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalo);
  }, [estado, filaActual]);

  const handleMarcar = (item) => {
    if (estado !== 'test') return;
    if (item.fila !== filaActual) return;

    setRespuestas(prev => {
      const key = item.id;
      if (prev[key]) {
        const nueva = { ...prev };
        delete nueva[key];
        return nueva;
      } else {
        return { ...prev, [key]: Date.now() };
      }
    });
  };

  // --- LÓGICA DE INTERPRETACIÓN ---
  const calcularInterpretacion = (con, errores) => {
    let texto = "";

    if (con > 200) texto = "Desempeño Sobresaliente. Capacidad atencional muy superior.";
    else if (con > 150) texto = "Desempeño Alto. Buena capacidad de concentración.";
    else if (con > 100) texto = "Desempeño Promedio. Atención normal.";
    else if (con > 50) texto = "Desempeño Bajo. Se observan dificultades de atención.";
    else texto = "Desempeño Deficiente. Posibles problemas de concentración significativos.";

    if (errores > 20) texto += " (Alta tasa de error: Impulsividad detectada).";

    return texto;
  };

  const finalizarTest = async () => {
    if (envioEnCursoRef.current) return;
    envioEnCursoRef.current = true;

    setEstado('enviando');
    setErrorEnvio(null);

    let tr_total = 0, ta_total = 0, eo_total = 0, ec_total = 0;
    const tr_por_fila = [];

    const detalle_filas = items.map((fila, index) => {
      let ultimoIndiceClic = -1;
      fila.forEach((item, idx) => { if (respuestas[item.id]) ultimoIndiceClic = idx; });
      const trFila = ultimoIndiceClic === -1 ? 0 : ultimoIndiceClic + 1;
      tr_por_fila.push(trFila);

      let A = 0, EO = 0, EC = 0;
      for (let i = 0; i < CONFIG.ITEMS_POR_FILA; i++) {
        const item = fila[i];
        const marcado = !!respuestas[item.id];
        if (i < trFila) {
          if (item.esObjetivo) {
            if (marcado) A++; else EO++;
          } else {
            if (marcado) EC++;
          }
        }
      }
      tr_total += trFila; ta_total += A; eo_total += EO; ec_total += EC;
      return { numero_fila: index + 1, tr: trFila, ta: A, eo: EO, ec: EC };
    });

    const tot_total = tr_total;
    const con_total = ta_total - ec_total;
    const var_total = tr_por_fila.length > 0 ? (Math.max(...tr_por_fila) - Math.min(...tr_por_fila)) : 0;
    const e_porcentaje = tr_total > 0 ? ((eo_total + ec_total) / tr_total) * 100 : 0;

    const interpretacion = calcularInterpretacion(con_total, eo_total + ec_total);

    const payload = {
      curso: cursoId,
      recurso: recursoId,
      tr_total,
      ta_total,
      eo_total,
      ec_total,
      tot: tot_total,
      con: con_total,
      var: var_total,
      interpretacion,
      filas: detalle_filas
    };

    setResultadosFinales({ ...payload, e_porcentaje });

    if (!token) {
      setErrorEnvio("No se pudo guardar: sesión expirada (token vacío). Vuelve a iniciar sesión.");
      setEstado('finalizado');
      envioEnCursoRef.current = false;
      return;
    }
    if (!recursoId) {
      setErrorEnvio("No se pudo guardar: falta el ID del recurso del test (recursoId).");
      setEstado('finalizado');
      envioEnCursoRef.current = false;
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/evaluaciones/resultados-d2r/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} - ${txt || 'Error al guardar'}`);
      }

      console.log("✅ Resultados guardados");

    } catch (error) {
      console.error("Error enviando test:", error);
      setErrorEnvio("Error de conexión (datos locales mostrados).");
    } finally {
      setEstado('finalizado');
      envioEnCursoRef.current = false;
    }
  };

  const progreso = Math.round(((filaActual + 1) / CONFIG.TOTAL_FILAS) * 100);

  const renderItem = (item, activo) => {
    const marcado = !!respuestas[item.id];

    const base = "relative flex flex-col items-center justify-center w-8 h-12 rounded-lg select-none transition";
    const estadoActivo = activo ? "cursor-pointer" : "opacity-40 pointer-events-none grayscale";
    const estadoMarcado = marcado
      ? "bg-yellow-200 ring-2 ring-yellow-500 shadow-sm"
      : "bg-white hover:bg-gray-50 border border-transparent hover:border-gray-200";

    return (
      <div
        key={item.id}
        onMouseDown={(e) => { e.preventDefault(); handleMarcar(item); }}
        className={`${base} ${estadoActivo} ${estadoMarcado}`}
      >
        <div className="flex gap-0.5 h-2">
          {Array.from({ length: item.top }).map((_, i) => (
            <div key={i} className="w-0.5 h-2.5 bg-gray-900/90"></div>
          ))}
        </div>

        <span className="text-2xl font-serif font-bold leading-none my-0.5 text-gray-900">
          {item.letra}
        </span>

        <div className="flex gap-0.5 h-2">
          {Array.from({ length: item.bot }).map((_, i) => (
            <div key={i} className="w-0.5 h-2.5 bg-gray-900/90"></div>
          ))}
        </div>

        {marcado && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-0.5 bg-red-500 rotate-[-45deg] rounded"></div>
          </div>
        )}
      </div>
    );
  };

  const EjemploObjetivo = ({ top, bot }) => (
    <div className="flex flex-col items-center">
      <div className="relative flex flex-col items-center justify-center w-14 h-16 rounded-xl bg-gradient-to-br from-green-50 to-white border-2 border-green-300 shadow-sm">
        <div className="flex gap-0.5 h-2">
          {Array.from({ length: top }).map((_, i) => (
            <div key={i} className="w-1 h-3 bg-gray-900/90"></div>
          ))}
        </div>
        <span className="text-3xl font-serif font-bold leading-none my-0.5 text-gray-900">d</span>
        <div className="flex gap-0.5 h-2">
          {Array.from({ length: bot }).map((_, i) => (
            <div key={i} className="w-1 h-3 bg-gray-900/90"></div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 text-xs text-gray-600 font-bold">{top} + {bot} = 2</div>
    </div>
  );

  // --- VISTAS ---

  if (estado === 'instrucciones') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header elegante y limpio */}
          <div className="relative p-8 sm:p-12 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white">
            <div className="relative z-10">
              <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 tracking-tight">
                Test de Atención D2-R
              </h1>
              <p className="text-lg sm:text-xl text-blue-100 leading-relaxed max-w-2xl">
                Evaluación de concentración y atención sostenida mediante la identificación de símbolos objetivo.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold">Duración: {Math.round((CONFIG.TOTAL_FILAS * CONFIG.TIEMPO_POR_FILA) / 60)} minutos</span>
              </div>
            </div>
            {/* Decoración */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
          </div>

          <div className="p-8 sm:p-12">
            {/* Instrucción principal destacada */}
            <div className="mb-10 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="bg-amber-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-md">
                  !
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Objetivo del Test</h2>
                  <p className="text-lg text-gray-800 leading-relaxed">
                    Marca <strong className="text-amber-700">únicamente</strong> la letra{' '}
                    <strong className="text-3xl font-serif mx-1">d</strong> que tenga{' '}
                    <strong className="text-amber-700">exactamente 2 rayitas</strong> en total (arriba y/o abajo).
                  </p>
                </div>
              </div>
            </div>

            {/* Ejemplos visuales mejorados */}
            <div className="mb-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ejemplos Visuales
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Marcar - TODAS las variantes */}
                <div className="rounded-2xl border-2 border-green-400 bg-gradient-to-br from-green-50 to-white p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl shadow-md">
                      ✓
                    </div>
                    <h4 className="text-lg font-bold text-green-800">Marcar estas (d con 2 rayas)</h4>
                  </div>

                  <div className="flex justify-center gap-6 mb-5">
                    <EjemploObjetivo top={2} bot={0} />
                    <EjemploObjetivo top={1} bot={1} />
                    <EjemploObjetivo top={0} bot={2} />
                  </div>

                  <p className="text-sm text-center text-gray-700 bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                    Cualquier combinación de <strong>d</strong> que sume <strong>2 rayitas en total</strong>
                  </p>
                </div>

                {/* Ignorar - ejemplos */}
                <div className="rounded-2xl border-2 border-red-400 bg-gradient-to-br from-red-50 to-white p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl shadow-md">
                      ✗
                    </div>
                    <h4 className="text-lg font-bold text-red-800">NO marcar (ignorar)</h4>
                  </div>

                  <div className="flex justify-center gap-4 mb-5">
                    {/* d con 1 raya */}
                    <div className="flex flex-col items-center">
                      <div className="relative flex flex-col items-center justify-center w-14 h-16 rounded-xl bg-white border-2 border-gray-300 shadow-sm">
                        <div className="flex gap-0.5 h-2">
                          <div className="w-1 h-3 bg-gray-900/90"></div>
                        </div>
                        <span className="text-3xl font-serif font-bold leading-none my-0.5">d</span>
                        <div className="flex gap-0.5 h-2"></div>
                      </div>
                      <div className="mt-1.5 text-xs text-gray-600 font-bold">1 raya</div>
                    </div>

                    {/* d con 3 rayas */}
                    <div className="flex flex-col items-center">
                      <div className="relative flex flex-col items-center justify-center w-14 h-16 rounded-xl bg-white border-2 border-gray-300 shadow-sm">
                        <div className="flex gap-0.5 h-2">
                          <div className="w-1 h-3 bg-gray-900/90"></div>
                          <div className="w-1 h-3 bg-gray-900/90"></div>
                          <div className="w-1 h-3 bg-gray-900/90"></div>
                        </div>
                        <span className="text-3xl font-serif font-bold leading-none my-0.5">d</span>
                        <div className="flex gap-0.5 h-2"></div>
                      </div>
                      <div className="mt-1.5 text-xs text-gray-600 font-bold">3 rayas</div>
                    </div>

                    {/* p con 2 rayas */}
                    <div className="flex flex-col items-center">
                      <div className="relative flex flex-col items-center justify-center w-14 h-16 rounded-xl bg-white border-2 border-gray-300 shadow-sm">
                        <div className="flex gap-0.5 h-2">
                          <div className="w-1 h-3 bg-gray-900/90"></div>
                          <div className="w-1 h-3 bg-gray-900/90"></div>
                        </div>
                        <span className="text-3xl font-serif font-bold leading-none my-0.5">p</span>
                        <div className="flex gap-0.5 h-2"></div>
                      </div>
                      <div className="mt-1.5 text-xs text-gray-600 font-bold">letra p</div>
                    </div>
                  </div>

                  <p className="text-sm text-center text-gray-700 bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                    La letra <strong>p</strong> siempre se ignora, y <strong>d</strong> con 0, 1, 3 o 4 rayas
                  </p>
                </div>
              </div>
            </div>

            {/* Instrucciones de funcionamiento */}
            <div className="mb-10 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ¿Cómo funciona?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex gap-4 items-start bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl">⏱️</div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1">Tiempo limitado</p>
                    <p className="text-sm text-gray-600">Tienes {CONFIG.TIEMPO_POR_FILA} segundos por cada fila</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl">🖱️</div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1">Marca y desmarca</p>
                    <p className="text-sm text-gray-600">Haz clic para marcar, otro clic para desmarcar</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl">⚡</div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1">Avance automático</p>
                    <p className="text-sm text-gray-600">Al terminar el tiempo, pasas a la siguiente fila</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Consejo */}
            <div className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5 flex items-start gap-4 shadow-sm">
              <div className="text-3xl">💡</div>
              <p className="text-sm text-gray-800 leading-relaxed">
                <strong className="text-purple-700">Consejo:</strong> Mantén un ritmo constante y no te detengas demasiado en un solo símbolo. La velocidad y precisión son importantes.
              </p>
            </div>

            {/* Botón de inicio */}
            <Button
              onClick={() => setEstado('test')}
              className="w-full text-lg py-5 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Comenzar Test
              </span>
            </Button>
            <p className="mt-4 text-center text-sm text-gray-500">
              El cronómetro se activará automáticamente al iniciar
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (estado === 'enviando') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
          <h3 className="text-xl font-extrabold text-gray-900">Procesando resultados</h3>
          <p className="mt-2 text-sm text-gray-600">
            Estamos calculando tus métricas y preparando el reporte…
          </p>
        </div>
      </div>
    );
  }

  if (estado === 'finalizado') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 sm:p-8 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Resultados del Test</h2>
            <p className="mt-1 text-sm text-gray-600">
              Aquí tienes tu resumen. Puedes volver al curso cuando lo desees.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {errorEnvio && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-bold text-red-700">⚠️ {errorEnvio}</p>
                <p className="text-xs text-red-600 mt-1">
                  Tus resultados se muestran en pantalla, pero no se pudieron guardar.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-xs text-blue-800 uppercase font-bold">Velocidad (TOT)</p>
                <p className="mt-2 text-4xl font-extrabold text-blue-700">{resultadosFinales?.tot}</p>
                <p className="mt-1 text-xs text-blue-700/80">Total revisado</p>
              </div>

              <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
                <p className="text-xs text-green-800 uppercase font-bold">Concentración (CON)</p>
                <p className="mt-2 text-4xl font-extrabold text-green-700">{resultadosFinales?.con}</p>
                <p className="mt-1 text-xs text-green-700/80">Aciertos - Comisión</p>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
                <p className="text-xs text-rose-800 uppercase font-bold">% Error</p>
                <p className="mt-2 text-4xl font-extrabold text-rose-700">{resultadosFinales?.e_porcentaje?.toFixed(1)}%</p>
                <p className="mt-1 text-xs text-rose-700/80">Omisión + Comisión</p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 mb-6">
              <p className="text-xs text-gray-500 uppercase font-bold">Interpretación</p>
              <p className="mt-2 text-base sm:text-lg font-semibold text-gray-900">
                {resultadosFinales?.interpretacion}
              </p>
            </div>

            <Button
              onClick={() => onFinished && onFinished(resultadosFinales)}
              className="w-full text-lg py-3"
            >
              Finalizar y Volver al Curso
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- UI TEST (estado === 'test') ---
  return (
    <div className="w-full max-w-6xl mx-auto select-none px-3 sm:px-4">
      <div className="fixed top-20 left-0 right-0 z-40">
        <div className="mx-auto max-w-6xl px-3 sm:px-4">
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="h-1.5 bg-gray-100">
              <div
                className="h-1.5 bg-blue-600 transition-all duration-300"
                style={{ width: `${progreso}%` }}
              ></div>
            </div>

            <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-bold uppercase">Progreso</span>
                  <span className="text-lg sm:text-xl font-extrabold text-blue-700">
                    Fila {filaActual + 1} / {CONFIG.TOTAL_FILAS}
                  </span>
                </div>

                <button
                  onClick={avanzarFila}
                  className="hidden sm:inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 active:scale-[0.98] transition"
                >
                  Siguiente
                  <span aria-hidden>➡️</span>
                </button>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`px-3 py-2 rounded-xl border text-center min-w-[90px]`}>
                  <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${tiempoRestante < 5 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                    {tiempoRestante}s
                  </div>
                  <div className="text-[10px] uppercase font-bold text-gray-500 -mt-1">Tiempo</div>
                </div>

                <div className="hidden md:block text-xs bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                  <span className="font-bold text-gray-600">Objetivo:</span>{' '}
                  <span className="text-gray-900 font-extrabold">d</span>{' '}
                  con <span className="font-extrabold text-gray-900">2 rayas</span>
                </div>

                <button
                  onClick={avanzarFila}
                  className="sm:hidden inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 active:scale-[0.98] transition"
                >
                  Siguiente <span aria-hidden>➡️</span>
                </button>
              </div>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-gray-500 text-center">
            Marca solo el objetivo. Puedes desmarcar con otro clic.
          </p>
        </div>
      </div>

      <div className="mt-36 sm:mt-32 mb-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm font-bold text-gray-900">
              Fila activa: <span className="text-blue-700">{filaActual + 1}</span>
            </div>
            <div className="text-xs text-gray-500">
              Total símbolos por fila: <span className="font-bold">{CONFIG.ITEMS_POR_FILA}</span>
            </div>
          </div>

          <div className="p-4 sm:p-6 min-h-[220px] flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
            {items[filaActual] && (
              <div className="flex flex-wrap gap-1.5 justify-center animate-fadeIn">
                {items[filaActual].map(item => renderItem(item, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
