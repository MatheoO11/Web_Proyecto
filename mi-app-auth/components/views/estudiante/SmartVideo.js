import { useState, useRef, useEffect } from 'react';

// ✅ VERSIÓN API NATIVA (Estable y Ligera)
export default function SmartVideo({ videoUrl, checkpoints = [], onVideoStart, onVideoEnd }) {
  const [checkpointActual, setCheckpointActual] = useState(null);
  const [videoTerminado, setVideoTerminado] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [preguntasEstado, setPreguntasEstado] = useState([]);
  const [error, setError] = useState(null);

  // Feedback visual (Colores al responder)
  const [feedback, setFeedback] = useState(null);

  // Referencias para controlar el player sin re-renderizar
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const preguntasRef = useRef([]);

  // Extraer ID de YouTube de la URL
  const getVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(videoUrl);

  // --- 1. Inicialización de Preguntas ---
  useEffect(() => {
    if (checkpoints && checkpoints.length > 0) {
      const nuevasPreguntas = checkpoints.map(cp => ({ ...cp, visto: false }));
      setPreguntasEstado(nuevasPreguntas);
      preguntasRef.current = nuevasPreguntas;
    }
  }, [checkpoints]);

  // --- 2. Carga de la API de YouTube ---
  useEffect(() => {
    if (!videoId) return;

    const initPlayer = () => {
      // Limpiar instancia previa si existe
      if (playerRef.current) {
        try {
          // Si tiene método destroy, lo usamos
          if (typeof playerRef.current.destroy === 'function') playerRef.current.destroy();
        } catch (e) { }
      }

      playerRef.current = new window.YT.Player('youtube-player-div', {
        videoId: videoId,
        height: '100%',
        width: '100%',
        playerVars: {
          modestbranding: 1,
          rel: 0,
          controls: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined
        },
        events: {
          onReady: handlePlayerReady,
          onStateChange: handleStateChange,
          onError: handleError,
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.id = 'youtube-api-script';
      if (!document.getElementById('youtube-api-script')) {
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
      window.onYouTubeIframeAPIReady = () => initPlayer();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current = null;
    };
  }, [videoId]);

  // --- 3. Handlers del Player ---

  const handlePlayerReady = (event) => {
    console.log("✅ Player listo");
    setPlayerReady(true);

    // Iniciar el vigilante del tiempo
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const currentTime = Math.floor(playerRef.current.getCurrentTime());
        checkForCheckpoint(currentTime);
      }
    }, 500);
  };

  const handleStateChange = (event) => {
    // Estado 1 = Reproduciendo (PLAY) -> Encendemos cámara
    if (event.data === 1) {
      if (onVideoStart) onVideoStart();
    }
    // Estado 2 = Pausado (PAUSE) -> Apagamos cámara
    if (event.data === 2) {
      if (onVideoEnd) onVideoEnd();
    }
    // Estado 0 = Terminado (ENDED)
    if (event.data === 0) {
      console.log("🏁 Video terminado");
      setVideoTerminado(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (onVideoEnd) onVideoEnd(); // Apagamos cámara
    }
  };

  const handleError = (event) => {
    console.error("Error YouTube:", event.data);
    setError("El video no está disponible o es privado.");
  };

  // --- 4. Lógica de Preguntas ---

  const checkForCheckpoint = (currentTime) => {
    const preguntasActuales = preguntasRef.current;
    const preguntaEncontrada = preguntasActuales.find(
      p => p.segundo == currentTime && !p.visto
    );

    if (preguntaEncontrada) {
      // Pausar video
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }

      setCheckpointActual(preguntaEncontrada);

      // Marcar como visto
      const nuevasPreguntas = preguntasActuales.map(p =>
        p.id === preguntaEncontrada.id ? { ...p, visto: true } : p
      );
      preguntasRef.current = nuevasPreguntas;
      setPreguntasEstado(nuevasPreguntas);
    }
  };

  const handleResponder = (indexSeleccionado) => {
    if (feedback) return;

    const letras = ['A', 'B', 'C', 'D'];
    const esCorrecta = letras[indexSeleccionado] === checkpointActual.respuesta_correcta;

    setFeedback({
      seleccionado: indexSeleccionado,
      esCorrecta: esCorrecta,
      letraCorrecta: checkpointActual.respuesta_correcta
    });

    // Esperar 2s para ver el color y continuar
    setTimeout(() => {
      setFeedback(null);
      setCheckpointActual(null);

      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      }
    }, 2000);
  };

  // --- 5. Renderizado ---

  if (!videoId) return <div className="bg-gray-100 p-10 text-center rounded-xl">URL inválida</div>;

  return (
    <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-xl">

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-20">
          <p>{error}</p>
        </div>
      )}

      {/* Contenedor YouTube (ID crucial para la API) */}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <div id="youtube-player-div" className="absolute top-0 left-0 w-full h-full"></div>

        {!playerReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <p className="text-white text-sm animate-pulse">Cargando...</p>
          </div>
        )}
      </div>

      {/* Modal Pregunta */}
      {checkpointActual && (
        <div className="absolute inset-0 bg-black/95 z-30 flex items-center justify-center p-6 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl border-l-4 border-blue-600">
            <h3 className="text-xl font-bold text-gray-800 mb-4">⏱️ Pregunta de control</h3>
            <p className="text-gray-600 mb-6 text-lg font-medium">{checkpointActual.texto_pregunta}</p>
            <div className="space-y-3">
              {checkpointActual.opciones.map((opcion, idx) => {
                let claseBtn = "bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-500 text-gray-700";
                const letras = ['A', 'B', 'C', 'D'];

                if (feedback) {
                  if (letras[idx] === feedback.letraCorrecta) claseBtn = "bg-green-100 border-green-500 text-green-800 font-bold";
                  else if (idx === feedback.seleccionado && !feedback.esCorrecta) claseBtn = "bg-red-100 border-red-500 text-red-800";
                  else claseBtn = "bg-gray-50 border-gray-100 text-gray-400 opacity-50";
                }

                return (
                  <button key={idx} onClick={() => handleResponder(idx)} disabled={!!feedback} className={`w-full text-left p-4 rounded-lg border-2 transition flex items-center group font-medium ${claseBtn}`}>
                    <span className="w-6 h-6 rounded-full border-2 border-current mr-3 flex items-center justify-center text-xs opacity-70">{letras[idx]}</span>
                    {opcion}
                  </button>
                );
              })}
            </div>
            {feedback && (
              <div className="mt-4 text-center font-bold animate-pulse">
                {feedback.esCorrecta ? <span className="text-green-600">✨ ¡Correcto!</span> : <span className="text-red-600">❌ Incorrecto.</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pantalla Final */}
      {videoTerminado && (
        <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center text-white">
          <h3 className="text-2xl font-bold">¡Clase Completada!</h3>
          <button
            onClick={() => {
              setVideoTerminado(false);
              // Reinicio manual usando la API nativa
              if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                playerRef.current.seekTo(0);
                playerRef.current.playVideo();
              }
            }}
            className="mt-6 bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200"
          >
            Ver de nuevo
          </button>
        </div>
      )}
    </div>
  );
}
