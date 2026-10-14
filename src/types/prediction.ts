export const CROP_CLASSES = {
  maize: ["Blight", "Common_Rust", "Gray_Leaf_Spot", "Healthy"],
  wheat: ["Healthy", "septoria", "stripe_rust"],
} as const;

export type Crop = keyof typeof CROP_CLASSES;
export const KNOWN_CLASSES = [
  ...CROP_CLASSES.maize,
  ...CROP_CLASSES.wheat.filter((name) => !CROP_CLASSES.maize.includes(name as never)),
] as const;
export type KnownClass = (typeof KNOWN_CLASSES)[number];

export type ClassProbabilities = Record<string, number>;

export interface PredictionResult {
  crop: Crop;
  predictedClass: string;
  confidence: number;
  confidencePercent: number;
  probabilities: ClassProbabilities;
  model?: string;
  success?: boolean;
  heatmapBase64?: string | null;
  overlayBase64?: string | null;
  heatmapFormat?: string | null;
  heatmap?: string | null;
  overlay?: string | null;
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

export type BackendStatus =
  | "checking"
  | "online"
  | "degraded"
  | "offline"
  | "not-configured";

export interface HealthInfo {
  status: BackendStatus;
  message: string;
  checkedAt?: string;
}
