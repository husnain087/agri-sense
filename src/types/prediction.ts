export const KNOWN_CLASSES = ["Healthy", "septoria", "stripe_rust"] as const;

export type KnownClass = (typeof KNOWN_CLASSES)[number];

export type ClassProbabilities = Record<string, number>;

export interface PredictionResult {
  predictedClass: string;
  confidence: number;
  confidencePercent: number;
  probabilities: ClassProbabilities;
  model?: string;
  success?: boolean;
  heatmapBase64?: string | null;
  overlayBase64?: string | null;
  heatmapFormat?: string | null;
  explanation?: string | null;
  timestamp?: string | null;
  raw: Record<string, unknown>;
}

export interface PredictOk {
  ok: true;
  result: PredictionResult;
}

export interface PredictErr {
  ok: false;
  message: string;
  status?: number;
}

export type PredictOutcome = PredictOk | PredictErr;

export type BackendStatus = "checking" | "online" | "offline";

export interface HealthInfo {
  status: BackendStatus;
  message: string;
  modelLoaded?: boolean;
  checkedAt?: string;
}
