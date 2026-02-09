// mi-app-auth/lib/attentionMath.js

// Landmarks MediaPipe FaceMesh (incluye iris)
const P = {
  // Head pose
  NOSE: 1,
  CHIN: 152,
  FOREHEAD: 10,
  LEFT_EAR: 234,
  RIGHT_EAR: 454,

  // Eyes corners (para “gaze” horizontal)
  RIGHT_EYE_INNER: 133,
  RIGHT_EYE_OUTER: 33,
  LEFT_EYE_INNER: 362,
  LEFT_EYE_OUTER: 263,

  // Iris centers
  RIGHT_IRIS: 468,
  LEFT_IRIS: 473,

  // EAR (párpados) - ojo izquierdo
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  LEFT_EYE_L: 33,
  LEFT_EYE_R: 133,
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const clamp01 = (v) => Math.max(0, Math.min(1, v));

const safeDiv = (a, b, fallback = 0) => (b === 0 ? fallback : a / b);

// EAR (parpadeo/somnolencia)
const calcEAR = (lm) => {
  const top = lm[P.LEFT_EYE_TOP];
  const bottom = lm[P.LEFT_EYE_BOTTOM];
  const l = lm[P.LEFT_EYE_L];
  const r = lm[P.LEFT_EYE_R];
  const vert = dist(top, bottom);
  const horiz = dist(l, r);
  return safeDiv(vert, horiz, 0.3);
};

// Yaw aproximado (mirar izquierda/derecha con cabeza) usando nariz vs centro orejas
const calcYaw = (lm) => {
  const nose = lm[P.NOSE];
  const le = lm[P.LEFT_EAR];
  const re = lm[P.RIGHT_EAR];
  const centerX = (le.x + re.x) / 2;
  const faceW = Math.abs(re.x - le.x);
  return safeDiv(nose.x - centerX, faceW, 0); // + = hacia derecha (relativo cámara)
};

// Pitch aproximado (mirar arriba/abajo con cabeza) nariz vs centro frente/mentón
const calcPitch = (lm) => {
  const nose = lm[P.NOSE];
  const f = lm[P.FOREHEAD];
  const c = lm[P.CHIN];
  const centerY = (f.y + c.y) / 2;
  const faceH = Math.abs(c.y - f.y);
  return safeDiv(nose.y - centerY, faceH, 0); // + = mirando abajo
};

// Gaze horizontal con iris (0..1): 0 = mira derecha, 1 = mira izquierda (relativo cámara)
const calcGaze = (lm) => {
  const rIris = lm[P.RIGHT_IRIS];
  const rOut = lm[P.RIGHT_EYE_OUTER];
  const rIn = lm[P.RIGHT_EYE_INNER];

  const lIris = lm[P.LEFT_IRIS];
  const lOut = lm[P.LEFT_EYE_OUTER];
  const lIn = lm[P.LEFT_EYE_INNER];

  // ojo derecho
  const rMinX = Math.min(rOut.x, rIn.x);
  const rMaxX = Math.max(rOut.x, rIn.x);
  const r = clamp01(safeDiv(rIris.x - rMinX, rMaxX - rMinX, 0.5));

  // ojo izquierdo
  const lMinX = Math.min(lOut.x, lIn.x);
  const lMaxX = Math.max(lOut.x, lIn.x);
  const l = clamp01(safeDiv(lIris.x - lMinX, lMaxX - lMinX, 0.5));

  // Promedio
  return (r + l) / 2;
};

/**
 * Devuelve decisión + métricas crudas:
 * - isDistracted: boolean (lo que guardas a BD)
 * - label: texto para UI
 * - metrics: yaw, pitch, gaze, ear
 */
export const analyzeAttentionState = (landmarks) => {
  if (!landmarks) {
    return {
      isDistracted: true,
      label: "⚠️ Rostro NO detectado",
      metrics: { yaw: 0, pitch: 0, gaze: 0.5, ear: 0.3 },
    };
  }

  const ear = calcEAR(landmarks);
  const yaw = calcYaw(landmarks);
  const pitch = calcPitch(landmarks);
  const gaze = calcGaze(landmarks);

  // UMBRALES (más estrictos para “ojos a los lados” y “cabeza arriba/abajo”)
  const EAR_SLEEP = 0.20;

  const YAW_HEAD = 0.10;      // cabeza a lados
  const PITCH_DOWN = 0.12;    // mirando abajo
  const PITCH_UP = -0.12;     // mirando arriba

  // gaze: 0..1 (0 derecha, 1 izquierda)
  const GAZE_RIGHT = 0.35;
  const GAZE_LEFT = 0.65;

  // Reglas
  if (ear < EAR_SLEEP) {
    return { isDistracted: true, label: "Somnolencia 😴", metrics: { yaw, pitch, gaze, ear } };
  }

  // cabeza
  if (yaw > YAW_HEAD) {
    return { isDistracted: true, label: "Cabeza Derecha ❌", metrics: { yaw, pitch, gaze, ear } };
  }
  if (yaw < -YAW_HEAD) {
    return { isDistracted: true, label: "Cabeza Izquierda ❌", metrics: { yaw, pitch, gaze, ear } };
  }
  if (pitch > PITCH_DOWN) {
    return { isDistracted: true, label: "Mirando Abajo 📱", metrics: { yaw, pitch, gaze, ear } };
  }
  if (pitch < PITCH_UP) {
    return { isDistracted: true, label: "Mirando Arriba ❌", metrics: { yaw, pitch, gaze, ear } };
  }

  // ojos (aunque cabeza esté centrada)
  if (gaze < GAZE_RIGHT) {
    return { isDistracted: true, label: "Ojos Derecha 👀", metrics: { yaw, pitch, gaze, ear } };
  }
  if (gaze > GAZE_LEFT) {
    return { isDistracted: true, label: "Ojos Izquierda 👀", metrics: { yaw, pitch, gaze, ear } };
  }

  return { isDistracted: false, label: "Concentrado ✅", metrics: { yaw, pitch, gaze, ear } };
};
