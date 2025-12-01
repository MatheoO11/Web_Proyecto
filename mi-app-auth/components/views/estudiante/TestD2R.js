import { useState, useEffect, useRef } from 'react';
import Button from '../../common/Button';

export default function TestD2R({ onFinished }) {
  const [estado, setEstado] = useState('intro'); // intro, test, resultados
  const [filaActual, setFilaActual] = useState(0);
  const [tiempoRestante, setTiempoRestante] = useState(20);
  const [items, setItems] = useState([]);
  const [respuestas, setRespuestas] = useState({}); // Guardará { "fila-col": true/false }

  // Constantes del Test D2-R
  const TOTAL_FILAS = 14;
  const ITEMS_POR_FILA = 47;

  // --- 1. GENERACIÓN DE LOS ESTÍMULOS ---
  // Generamos una matriz de 14x47 con letras d/p y rayitas aleatorias
  useEffect(() => {
    const generarFila = (numFila) => {
      return Array.from({ length: ITEMS_POR_FILA }).map((_, colIndex) => {
        const esD = Math.random() > 0.5;
        const letra = esD ? 'd' : 'p';

        // Generar rayitas (0 a 2 arriba, 0 a 2 abajo)
        const rayitasArriba = Math.floor(Math.random() * 3);
        const rayitasAbajo = Math.floor(Math.random() * 3);
        const totalRayitas = rayitasArriba + rayitasAbajo;

        // ¿Es un objetivo válido? (Letra 'd' con exactamente 2 rayitas en total)
        const esObjetivo = letra === 'd' && totalRayitas === 2;

        return {
          id: `${numFila}-${colIndex}`,
          letra,
          rayitasArriba,
          rayitasAbajo,
          esObjetivo
        };
      });
    };

    const nuevasFilas = Array.from({ length: TOTAL_FILAS }).map((_, i) => generarFila(i));
    setItems(nuevasFilas);
  }, []);

  // --- 2. CRONÓMETRO Y CAMBIO DE FILA ---
  useEffect(() => {
    let intervalo = null;

    if (estado === 'test') {
      intervalo = setInterval(() => {
        setTiempoRestante((prev) => {
          if (prev <= 1) {
            // Se acabó el tiempo de la fila
            if (filaActual < TOTAL_FILAS - 1) {
              setFilaActual(f => f + 1);
              return 20; // Reiniciar a 20s para siguiente fila
            } else {
              setEstado('resultados');
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(intervalo);
  }, [estado, filaActual]);

  // --- 3. LÓGICA DE INTERACCIÓN ---
  const handleClickItem = (id) => {
    if (estado !== 'test') return;

    setRespuestas(prev => ({
      ...prev,
      [id]: !prev[id] // Alternar seleccionado/no seleccionado
    }));
  };

  const iniciarTest = () => {
    setEstado('test');
    setFilaActual(0);
    setTiempoRestante(20);
    setRespuestas({});
  };

  // --- 4. CÁLCULO DE RESULTADOS ---
  const calcularResultados = () => {
    let aciertos = 0;
    let omisiones = 0; // Era objetivo y no lo marcó
    let comisiones = 0; // No era objetivo y lo marcó (falso positivo)
    let procesados = 0; // Total de elementos vistos (aprox)

    // Solo calculamos hasta la fila que completó
    items.forEach((fila, fIndex) => {
      fila.forEach((item) => {
        const marcado = respuestas[item.id];

        if (item.esObjetivo && marcado) aciertos++;
        if (item.esObjetivo && !marcado) omisiones++;
        if (!item.esObjetivo && marcado) comisiones++;
      });
    });

    const totalErrores = omisiones + comisiones;
    const efectividad = aciertos - comisiones;

    return { aciertos, omisiones, comisiones, totalErrores, efectividad };
  };

  // --- RENDERIZADO DE UN SIMBOLO (LETRA CON RAYITAS) ---
  const renderSimbolo = (item, esActivo) => {
    const marcado = respuestas[item.id];

    // Generar rayitas visuales
    const renderRayitas = (num) => (
      <div className="flex space-x-0.5 h-2 justify-center">
        {Array.from({ length: num }).map((_, i) => (
          <div key={i} className="w-0.5 h-2 bg-gray-800 transform rotate-12"></div>
        ))}
      </div>
    );

    return (
      <div
        key={item.id}
        onClick={() => esActivo && handleClickItem(item.id)}
        className={`
          relative flex flex-col items-center justify-center w-8 h-12 border rounded cursor-pointer transition select-none
          ${marcado ? 'bg-yellow-200 border-yellow-400' : 'bg-white border-transparent hover:bg-gray-50'}
          ${esActivo ? 'opacity-100' : 'opacity-30 pointer-events-none'}
        `}
      >
        {renderRayitas(item.rayitasArriba)}
        <span className="text-xl font-serif font-bold leading-none">{item.letra}</span>
        {renderRayitas(item.rayitasAbajo)}

        {/* Marca visual si está seleccionado */}
        {marcado && (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="w-6 h-1 bg-red-500 transform -rotate-45"></div>
          </div>
        )}
      </div>
    );
  };

  // --- PANTALLAS ---

  if (estado === 'intro') {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">🧠</span>
          <h2 className="text-3xl font-bold text-gray-800">Test de Atención D2-R</h2>
          <p className="text-gray-500 mt-2">Evaluación de concentración y velocidad de procesamiento</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-blue-50 p-6 rounded-xl">
            <h3 className="font-bold text-blue-800 mb-3">🎯 Tu Misión</h3>
            <p className="text-sm text-blue-900 mb-4">
              Debes encontrar y marcar todas las letras <strong>'d'</strong> que tengan exactamente <strong>dos rayitas</strong>.
            </p>
            <div className="bg-white p-4 rounded border border-blue-200 flex justify-around items-center">
              <div className="text-center">
                <span className="text-xs text-gray-500 block mb-1">Objetivo</span>
                <div className="font-serif text-2xl font-bold relative">
                  d
                  <span className="absolute -top-2 left-0 right-0 flex justify-center space-x-0.5"><i className="w-0.5 h-2 bg-black"></i><i className="w-0.5 h-2 bg-black"></i></span>
                </div>
                <span className="text-green-600 font-bold text-xs">¡MARCAR!</span>
              </div>
              <div className="text-center opacity-50">
                <span className="text-xs text-gray-500 block mb-1">Ignorar</span>
                <div className="font-serif text-2xl font-bold relative">
                  p
                  <span className="absolute -top-2 left-0 right-0 flex justify-center space-x-0.5"><i className="w-0.5 h-2 bg-black"></i><i className="w-0.5 h-2 bg-black"></i></span>
                </div>
                <span className="text-red-500 font-bold text-xs">NO</span>
              </div>
              <div className="text-center opacity-50">
                <span className="text-xs text-gray-500 block mb-1">Ignorar</span>
                <div className="font-serif text-2xl font-bold relative">
                  d
                  <span className="absolute -top-2 left-0 right-0 flex justify-center space-x-0.5"><i className="w-0.5 h-2 bg-black"></i></span>
                </div>
                <span className="text-red-500 font-bold text-xs">NO (1 raya)</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-800">📋 Instrucciones</h3>
            <ul className="text-sm space-y-2 text-gray-600">
              <li className="flex items-start"><span className="mr-2">⏱️</span> Tienes <strong>20 segundos</strong> por cada fila.</li>
              <li className="flex items-start"><span className="mr-2">➡️</span> Trabaja de izquierda a derecha sin saltar nada.</li>
              <li className="flex items-start"><span className="mr-2">⚠️</span> Al acabar el tiempo, el sistema te pasará <strong>automáticamente</strong> a la siguiente fila.</li>
              <li className="flex items-start"><span className="mr-2">🏁</span> Son 14 filas en total.</li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <Button onClick={iniciarTest} className="w-full md:w-1/2 py-4 text-lg">
            ¡Estoy listo! Comenzar Test
          </Button>
        </div>
      </div>
    );
  }

  if (estado === 'resultados') {
    const res = calcularResultados();
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-2xl mx-auto text-center">
        <span className="text-6xl mb-4 block">🎉</span>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">¡Test Completado!</h2>
        <p className="text-gray-500 mb-8">Aquí está tu análisis de atención</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-green-50 p-4 rounded-lg">
            <span className="text-3xl font-bold text-green-600">{res.aciertos}</span>
            <p className="text-sm text-green-800">Aciertos</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <span className="text-3xl font-bold text-blue-600">{res.efectividad}</span>
            <p className="text-sm text-blue-800">Puntuación Total</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <span className="text-3xl font-bold text-yellow-600">{res.omisiones}</span>
            <p className="text-sm text-yellow-800">Omisiones (No vistos)</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <span className="text-3xl font-bold text-red-600">{res.comisiones}</span>
            <p className="text-sm text-red-800">Comisiones (Falsos positivos)</p>
          </div>
        </div>

        <Button onClick={() => window.location.reload()} variant="outline">
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  // PANTALLA DEL TEST ACTIVO
  return (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 select-none">
      {/* HEADER FIJO */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm sticky top-0 z-10 border border-gray-100">
        <div>
          <span className="text-xs text-gray-500 uppercase font-bold">Fila Actual</span>
          <p className="text-xl font-bold text-blue-600">#{filaActual + 1} <span className="text-gray-400 text-sm">/ {TOTAL_FILAS}</span></p>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-mono font-bold ${tiempoRestante <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
            00:{tiempoRestante < 10 ? `0${tiempoRestante}` : tiempoRestante}
          </div>
          <span className="text-xs text-gray-400">segundos restantes</span>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase font-bold">Objetivo</span>
          <div className="font-serif font-bold text-lg bg-gray-100 px-2 rounded border border-gray-300">
            d''
          </div>
        </div>
      </div>

      {/* GRILLA DE ITEMS (Solo mostramos la fila actual activa claramente) */}
      <div className="space-y-4">
        {items.map((fila, index) => {
          // Solo renderizamos la fila si es la actual (o la anterior para contexto visual tenue)
          if (index !== filaActual) return null;

          return (
            <div key={index} className="bg-white p-4 rounded shadow-sm border border-blue-200">
              <div className="flex flex-wrap gap-2 justify-center">
                {fila.map((item) => renderSimbolo(item, true))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
