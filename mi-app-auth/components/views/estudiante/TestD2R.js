import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../common/Button';

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

  // --- 1. GENERADOR (Aleatorio cada vez) ---
  // Aclaración: Aunque la regla (buscar d con 2 rayas) es fija,
  // la posición de las letras cambia siempre gracias a Math.random().
  // Esto hace que el test sea único en cada intento.
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
    // Estos baremos son demostrativos. En un test real usarías tablas de percentiles por edad.
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
    setEstado('enviando');

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

    // ✅ Calculamos la interpretación antes de enviar
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
      interpretacion: interpretacion, // ✅ Enviamos el texto al backend
      filas: detalle_filas
    };

    setResultadosFinales({ ...payload, e_porcentaje });

    try {
      const res = await fetch('http://127.0.0.1:8000/api/resultados-d2r/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al guardar');
      console.log("✅ Resultados guardados");

    } catch (error) {
      console.error("Error enviando test:", error);
      setErrorEnvio("Error de conexión (datos locales mostrados).");
    } finally {
      // ✅ NO llamamos a onFinished() aquí. Esperamos a que el usuario vea sus resultados.
      setEstado('finalizado');
    }
  };

  const renderItem = (item, activo) => {
    const marcado = !!respuestas[item.id];
    return (
      <div
        key={item.id}
        onMouseDown={(e) => { e.preventDefault(); handleMarcar(item); }}
        className={`
                flex flex-col items-center justify-center w-8 h-12 border rounded cursor-pointer select-none
                ${marcado ? 'bg-yellow-300 border-yellow-500' : 'bg-transparent border-transparent hover:bg-gray-100'}
                ${!activo ? 'opacity-40 pointer-events-none grayscale' : ''}
            `}
      >
        <div className="flex gap-0.5 h-2">
          {Array.from({ length: item.top }).map((_, i) => <div key={i} className="w-0.5 h-2.5 bg-black"></div>)}
        </div>
        <span className="text-2xl font-serif font-bold leading-none my-0.5">{item.letra}</span>
        <div className="flex gap-0.5 h-2">
          {Array.from({ length: item.bot }).map((_, i) => <div key={i} className="w-0.5 h-2.5 bg-black"></div>)}
        </div>
        {marcado && <div className="absolute w-6 h-0.5 bg-red-500 rotate-[-45deg]"></div>}
      </div>
    );
  };

  // --- VISTAS ---

  if (estado === 'instrucciones') {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-2xl mx-auto border border-gray-200">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Test de Atención D2-R</h2>
        <div className="text-left bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200 text-gray-700">
          <p className="mb-4"><strong>Instrucciones:</strong></p>
          <p>Tu tarea es buscar la letra <strong>d</strong> con <strong>2 rayitas</strong>.</p>
          <div className="flex gap-4 my-4 justify-center bg-white p-2 rounded border">
            <span className="text-green-600 font-bold">✓ Marcar: d'', 'd', 'd'</span>
            <span className="text-red-500 font-bold">✗ Ignorar: p, d', d'''</span>
          </div>
        </div>
        <Button onClick={() => setEstado('test')} className="w-full text-xl py-3 shadow-lg">COMENZAR TEST</Button>
      </div>
    );
  }

  if (estado === 'enviando') {
    return <div className="p-10 text-center text-xl font-bold text-blue-600 animate-pulse">Procesando resultados...</div>;
  }

  if (estado === 'finalizado') {
    return (
      <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Resultados del Test</h2>
        {errorEnvio && <p className="text-red-500 text-sm mb-4">{errorEnvio}</p>}

        <div className="bg-gray-100 p-4 rounded-lg mb-6 text-left">
          <p className="text-sm text-gray-500 uppercase font-bold">Interpretación Clínica:</p>
          <p className="text-lg text-gray-800 font-semibold">{resultadosFinales?.interpretacion}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-800 uppercase font-bold">Velocidad</p>
            <p className="text-3xl font-bold text-blue-600">{resultadosFinales?.tot}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-100">
            <p className="text-xs text-green-800 uppercase font-bold">Concentración</p>
            <p className="text-3xl font-bold text-green-600">{resultadosFinales?.con}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-100">
            <p className="text-xs text-red-800 uppercase font-bold">% Error</p>
            <p className="text-3xl font-bold text-red-600">{resultadosFinales?.e_porcentaje?.toFixed(1)}%</p>
          </div>
        </div>

        {/* ✅ BOTÓN DE SALIDA: Ahora el usuario decide cuándo irse */}
        <Button
          onClick={() => onFinished && onFinished(resultadosFinales)}
          className="w-full text-lg py-3"
        >
          Finalizar y Volver al Curso
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto select-none">
      <div className="fixed top-20 left-0 right-0 bg-white shadow-lg p-2 z-40 flex justify-between items-center px-4 md:px-8 border-b-4 border-blue-600">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold text-blue-700">Fila {filaActual + 1} / {CONFIG.TOTAL_FILAS}</span>
          <button onClick={avanzarFila} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-semibold border border-gray-300">Siguiente ➡️</button>
        </div>
        <div className={`text-4xl font-mono font-bold ${tiempoRestante < 5 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
          {tiempoRestante}s
        </div>
        <div className="hidden md:block text-xs bg-gray-100 px-3 py-1.5 rounded border border-gray-300">
          Objetivo: <strong>d</strong> con <strong>2 rayas</strong>
        </div>
      </div>

      <div className="mt-32 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-inner border border-gray-300 min-h-[180px] flex items-center justify-center relative">
          {items[filaActual] && (
            <div className="flex flex-wrap gap-1 justify-center animate-fadeIn">
              {items[filaActual].map(item => renderItem(item, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
