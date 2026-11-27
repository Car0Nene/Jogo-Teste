/**
 * Enquadramento da câmera de luta (puro, sem Three.js): mantém os dois lutadores inteiros na
 * área útil da tela (entre o placar e os controles), acompanha o pulo e aproxima no especial.
 * Extraído do GameEngine sem mudar o comportamento; o motor só aplica tremor e suavização.
 */
import type { FightFraming } from '../../platform/platform';

export interface FightCameraInput {
  x1: number;
  x2: number;
  /** altura do lutador mais alto (pulo) */
  maxY: number;
  framing: FightFraming;
  viewW: number;
  viewH: number;
  /** campo de visão vertical (graus) */
  fovDeg: number;
  /** especial em andamento: 0..1 da animação de foco e o x de quem soltou */
  superFocus?: { progress: number; x: number } | null;
}

export interface FightCameraShot {
  /** posição alvo da câmera (sem tremor) */
  x: number;
  y: number;
  z: number;
  /** ponto para onde ela olha */
  lookX: number;
  lookY: number;
  lookZ: number;
}

const MAX_DISTANCE = 60;
/** altura do corpo considerada para caber na tela (m) */
const BODY_HEIGHT = 3.1;

export function frameFight(i: FightCameraInput): FightCameraShot {
  const fr = i.framing;
  const midX = (i.x1 + i.x2) * 0.5;
  const span = Math.abs(i.x1 - i.x2);
  const w = Math.max(1, i.viewW);
  const h = Math.max(1, i.viewH);
  const baseDistance = fr.minDistance - 0.4 + span * 0.68;
  const tan = Math.tan(((i.fovDeg * Math.PI) / 180) * 0.5);
  const horizontalViewTangent = (tan * w) / h;
  const fitDistance = (span + fr.sideMargin) / (2 * Math.max(0.01, horizontalViewTangent));
  // altura: corpo + pulo cabem na área útil (entre HUD e controles)
  const usefulH = Math.max(0.25, 1 - fr.top - fr.bottom);
  const fitHeight = (BODY_HEIGHT + i.maxY) / (2 * tan * usefulH);
  const zDist = Math.min(MAX_DISTANCE, Math.max(fr.minDistance, Math.max(baseDistance, fitDistance, fitHeight)));

  // especial: aproxima e centraliza em quem soltou o golpe, depois volta suave
  let camX = midX;
  let camZ = zDist;
  if (i.superFocus) {
    const k = Math.sin(Math.min(1, Math.max(0, i.superFocus.progress)) * Math.PI);
    camX = midX + (i.superFocus.x - midX) * 0.75 * k;
    camZ = zDist * (1 - 0.28 * k);
  }
  return {
    x: camX * 0.85,
    y: 1.74 + i.maxY * 0.32 + Math.max(0, camZ - 10) * 0.11,
    z: camZ,
    lookX: camX * 0.9,
    lookY: 1.08 + i.maxY * 0.25,
    lookZ: -0.4,
  };
}
