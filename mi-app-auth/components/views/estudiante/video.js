// components/views/estudiante/video.js
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { analyzeAttentionState } from '../../../lib/attentionMath';
import { API_URL } from '@/config/api';

export default function Video({ isRecording = false, recursoId, finalizeKey = 0 }) {
  const { token } = useAuth();
  const [estadoAtencion, setEstadoAtencion] = useState('Esperando video...');
  const [distraccionDetectada, setDistraccionDetectada] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // Referencias
  const webcamRef = useRef(null);
  const cameraRef = useRef(null);
  const faceMeshRef = useRef(null);

  // Lógica y datos
  const recordingRef = useRef(isRecording);
  const timelineRef = useRef([]);
  const statsRef = useRef({ inicio: 0, framesTotales: 0, framesDistraido: 0 });

  // ✅ Ref para evitar closure viejo en sampler
  const distraccionRef = useRef(false);
  const estadoRef = useRef('Esperando video...');

  // ✅ Ventana para suavizado (robusto)
  const windowRef = useRef([]);

  // 1. DETECCIÓN DE ESTADO (Grabar / Parar)
  useEffect(() => {
    recordingRef.current = isRecording;
    let samplerInterval = null;

    if (isRecording) {
      console.log("🔴 [IA] INICIO DE GRABACIÓN. Recurso ID:", recursoId);
      if (!recursoId) console.error("⚠️ ADVERTENCIA: No se recibió ID del recurso. El guardado fallará.");

      // Reiniciar
      statsRef.current = { inicio: Date.now(), framesTotales: 0, framesDistraido: 0 };
      timelineRef.current = [];
      distraccionRef.current = false;
      estadoRef.current = 'Concentrado ✅';
      windowRef.current = [];

      // ✅ Sampler
      samplerInterval = setInterval(() => {
        if (!recordingRef.current) return;

        const segundos = Math.floor((Date.now() - statsRef.current.inicio) / 1000);
        timelineRef.current.push({
          segundo: Number(segundos),
          distraido: Boolean(distraccionRef.current),
          estado: String(estadoRef.current || '')
        });
      }, 1000);

    } else {
      // Solo “pausa” el tracking. NO guardar aquí.
      setEstadoAtencion("En espera del video...");
      setDistraccionDetectada(false);
      distraccionRef.current = false;
      estadoRef.current = "En espera del video...";
      windowRef.current = [];

      if (samplerInterval) clearInterval(samplerInterval);
      // ❌ NO GUARDAR AQUÍ (para evitar duplicados por pausas/preguntas)
    }

    return () => { if (samplerInterval) clearInterval(samplerInterval); };
  }, [isRecording, recursoId]);

  // ✅ 1.1 Guardar SOLO cuando el padre indique “finalizó video”
  useEffect(() => {
    if (!token) return;
    if (finalizeKey <= 0) return;

    // Si nunca se inició, no guardes
    if (statsRef.current.inicio <= 0) return;

    const duracion = (Date.now() - statsRef.current.inicio) / 1000;
    console.log(`🏁 [IA] Final del video. Duración total: ${duracion.toFixed(2)}s`);

    if (duracion > 2 && recursoId) {
      guardarSesion(
        duracion,
        statsRef.current.framesDistraido,
        statsRef.current.framesTotales,
        timelineRef.current
      );
    } else {
      console.warn(`⚠️ NO SE GUARDÓ: Duración (${duracion}s) menor a 2s o falta ID.`);
    }

    // Reset para evitar doble guardado
    statsRef.current.inicio = 0;
  }, [finalizeKey, recursoId, token]);

  const guardarSesion = async (duracion, framesMalos, framesTotales, timeline) => {
    if (!token) return;

    const ratio = framesTotales > 0 ? framesMalos / framesTotales : 0;
    const segundosDistraido = Math.round(duracion * ratio);
    const porcentajeAtencion = Math.max(0, Math.round((1 - ratio) * 100));

    const timelineNormalizado = Array.isArray(timeline)
      ? timeline.map((t) => ({
        segundo: Number(t.segundo) || 0,
        distraido: t.distraido === true || t.distraido === "true",
        estado: String(t.estado || '')
      }))
      : [];

    const payload = {
      recurso: Number(recursoId),
      duracion_total: Math.round(duracion),
      segundos_distraido: Number(segundosDistraido),
      porcentaje_atencion: Number(porcentajeAtencion),
      detalle_cronologico: timelineNormalizado
    };

    try {
      const res = await fetch(`${API_URL}/api/atencion/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error("❌ Error guardando sesión. Status:", res.status, txt);
      } else {
        console.log("✅ Sesión guardada correctamente");
      }
    } catch (e) {
      console.error("❌ Error guardando sesión:", e);
    }
  };

  // --- 2. INICIALIZACIÓN DE MEDIAPIPE ---
  useEffect(() => {
    let isMounted = true;

    const loadMediaPipe = async () => {
      try {
        const { FaceMesh } = await import('@mediapipe/face_mesh');
        const { Camera } = await import('@mediapipe/camera_utils');

        if (!isMounted) return;

        const faceMesh = new FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults(onResults);
        faceMeshRef.current = faceMesh;

        if (webcamRef.current) {
          const camera = new Camera(webcamRef.current, {
            onFrame: async () => {
              if (!isMounted || !webcamRef.current || !faceMeshRef.current) return;

              if (webcamRef.current.videoWidth === 0 || webcamRef.current.videoHeight === 0) return;

              try {
                await faceMeshRef.current.send({ image: webcamRef.current });
              } catch (err) {
                console.warn("Frame omitido por desmontaje");
              }
            },
            width: 640,
            height: 480,
          });

          cameraRef.current = camera;
          await camera.start();
          if (isMounted) setCameraActive(true);
        }
      } catch (error) {
        console.error("Error MediaPipe:", error);
      }
    };

    loadMediaPipe();

    // ✅ LIMPIEZA ROBUSTA
    return () => {
      isMounted = false;
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      faceMeshRef.current = null;
    };
  }, []);

  // --- 3. ALGORITMO DE ATENCIÓN ---
  const onResults = (results) => {
    if (!recordingRef.current) return;

    statsRef.current.framesTotales++;

    let decision = { isDistracted: true, label: "⚠️ Rostro NO detectado" };

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      decision = analyzeAttentionState(results.multiFaceLandmarks[0]);
    }

    // Suavizado
    windowRef.current.push(decision.isDistracted ? 1 : 0);
    if (windowRef.current.length > 8) windowRef.current.shift();

    const sum = windowRef.current.reduce((a, b) => a + b, 0);
    const esDistraccionSuavizada = sum >= 4;

    setEstadoAtencion(decision.label);
    setDistraccionDetectada(esDistraccionSuavizada);

    distraccionRef.current = esDistraccionSuavizada;
    estadoRef.current = decision.label;

    if (esDistraccionSuavizada) {
      statsRef.current.framesDistraido++;
    }
  };

  return (
    <div className={`relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg border-4 transition-colors duration-500 ${isRecording
      ? (distraccionDetectada ? 'border-red-500' : 'border-green-500')
      : 'border-gray-300'
      }`}>
      {!cameraActive && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <p className="animate-pulse">Iniciando cámara...</p>
        </div>
      )}
      <video ref={webcamRef} className="w-full h-full object-cover transform scale-x-[-1]" playsInline muted />
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-center backdrop-blur-sm">
        <p className={`text-xs font-bold ${isRecording ? (distraccionDetectada ? 'text-red-400' : 'text-green-400') : 'text-gray-300'}`}>
          {estadoAtencion}
        </p>
      </div>
    </div>
  );
}
