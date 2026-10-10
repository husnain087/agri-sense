import type { ClassProbabilities } from "./prediction";

export interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
}

export interface PredictionHistoryRow {
  id: string;
  user_id: string;
  predicted_class: string;
  confidence: number;
  probabilities: ClassProbabilities;
  image_path: string | null;
  created_at: string;
}

export interface SavePredictionInput {
  predictedClass: string;
  confidence: number;
  probabilities: ClassProbabilities;
  imageFile?: File | null;
}
