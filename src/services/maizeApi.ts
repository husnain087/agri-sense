import { MAIZE_API_HEALTH_URL, MAIZE_API_URL } from "../lib/env";
import {
  requestHealth,
  requestPrediction,
  type HealthApiAdapter,
  type PredictionApiAdapter,
  validateImageFile,
} from "./apiClient";

export { validateImageFile as validateMaizeImageFile };
export type { PredictionApiAdapter as MaizePredictionApiAdapter };

export function predictMaizeImage(
  file: File,
  adapter?: PredictionApiAdapter,
  signal?: AbortSignal,
) {
  return requestPrediction(MAIZE_API_URL, file, "maize", adapter, signal);
}

export function checkMaizeApiHealth(adapter?: HealthApiAdapter) {
  return requestHealth(MAIZE_API_URL, MAIZE_API_HEALTH_URL, adapter);
}
