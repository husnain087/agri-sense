import { WHEAT_API_HEALTH_URL, WHEAT_API_URL } from "../lib/env";
import {
  requestHealth,
  requestPrediction,
  type HealthApiAdapter,
  type PredictionApiAdapter,
} from "./apiClient";

export type { PredictionApiAdapter as WheatPredictionApiAdapter };

export function predictWheatImage(
  file: File,
  adapter?: PredictionApiAdapter,
  signal?: AbortSignal,
) {
  return requestPrediction(WHEAT_API_URL, file, "wheat", adapter, signal);
}

export function checkWheatApiHealth(adapter?: HealthApiAdapter) {
  return requestHealth(WHEAT_API_URL, WHEAT_API_HEALTH_URL, adapter);
}
