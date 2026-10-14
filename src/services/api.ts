import {
  CROP_IDENTIFIER_API_URL,
  MAIZE_API_URL,
  WHEAT_API_URL,
} from "../lib/env";
import type {
  Crop,
  HealthInfo,
  PredictOutcome,
} from "../types/prediction";
import {
  type HealthApiAdapter,
  type PredictionApiAdapter,
} from "./apiClient";
import {
  identifyCrop as identifyCropRequest,
  type CropIdentifierApiAdapter,
} from "./cropIdentifierApi";
import { checkMaizeApiHealth, predictMaizeImage } from "./maizeApi";
import { checkWheatApiHealth, predictWheatImage } from "./wheatApi";
import { checkCropIdentifierApiHealth } from "./cropIdentifierApi";
import {
  cropIdentifierAdapter as defaultCropIdentifierAdapter,
  maizePredictionAdapter,
  wheatPredictionAdapter,
} from "./apiAdapters";

export { FILE_LIMITS, validateImageFile } from "./apiClient";
export type { PredictionApiAdapter, HealthApiAdapter } from "./apiClient";
export type { CropIdentifierApiAdapter } from "./cropIdentifierApi";

const healthGetAdapter: HealthApiAdapter = {
  createRequest: () => ({ method: "GET" }),
};
const healthAdapters: Partial<Record<"maize" | "wheat" | "identifier", HealthApiAdapter>> = {
  maize: healthGetAdapter,
  wheat: healthGetAdapter,
  identifier: healthGetAdapter,
};
const predictionAdapters: Partial<Record<Crop, PredictionApiAdapter>> = {
  maize: maizePredictionAdapter,
  wheat: wheatPredictionAdapter,
};
let cropIdentifierAdapter: CropIdentifierApiAdapter | undefined =
  defaultCropIdentifierAdapter;

export function configurePredictionApiAdapters(adapters: {
  maize?: PredictionApiAdapter;
  wheat?: PredictionApiAdapter;
  cropIdentifier?: CropIdentifierApiAdapter;
  maizeHealth?: HealthApiAdapter;
  wheatHealth?: HealthApiAdapter;
  cropIdentifierHealth?: HealthApiAdapter;
}): void {
  if (adapters.maize) predictionAdapters.maize = adapters.maize;
  if (adapters.wheat) predictionAdapters.wheat = adapters.wheat;
  if (adapters.cropIdentifier) cropIdentifierAdapter = adapters.cropIdentifier;
  if (adapters.maizeHealth) healthAdapters.maize = adapters.maizeHealth;
  if (adapters.wheatHealth) healthAdapters.wheat = adapters.wheatHealth;
  if (adapters.cropIdentifierHealth) {
    healthAdapters.identifier = adapters.cropIdentifierHealth;
  }
}

export async function checkBackendHealth(): Promise<HealthInfo> {
  const [maize, wheat, identifier] = await Promise.all([
    checkMaizeApiHealth(healthAdapters.maize),
    checkWheatApiHealth(healthAdapters.wheat),
    checkCropIdentifierApiHealth(healthAdapters.identifier),
  ]);
  const checks = [maize, wheat, identifier];
  const endpointCount = [
    MAIZE_API_URL,
    WHEAT_API_URL,
    CROP_IDENTIFIER_API_URL,
  ].filter(Boolean).length;
  const active = checks.filter((health) => health.status !== "not-configured");
  const onlineCount = active.filter((health) => health.status === "online").length;

  if (endpointCount === 0) {
    return {
      status: "not-configured",
      message: "API endpoints not configured yet.",
      checkedAt: new Date().toISOString(),
    };
  }
  if (onlineCount === endpointCount) {
    return {
      status: "online",
      message: "All configured API health checks are responding.",
      checkedAt: new Date().toISOString(),
    };
  }
  if (onlineCount > 0) {
    return {
      status: "degraded",
      message: "Some configured API health checks are unavailable.",
      checkedAt: new Date().toISOString(),
    };
  }
  if (active.length > 0 && active.every((health) => health.status === "offline")) {
    return {
      status: "offline",
      message: "Configured API health checks are unavailable.",
      checkedAt: new Date().toISOString(),
    };
  }
  return {
    status: "not-configured",
    message: "Health-check URLs and request details are not configured yet.",
    checkedAt: new Date().toISOString(),
  };
}

export function predictLeafImage(
  file: File,
  crop: Crop | "auto" = "auto",
  signal?: AbortSignal,
  onCropIdentified?: (crop: Crop, confidence: number) => void,
): Promise<PredictOutcome> {
  if (crop === "auto") {
    return (async () => {
      const identification = await identifyCrop(file, signal);
      if (!identification.ok) return identification;
      onCropIdentified?.(identification.crop, identification.confidence);
      return identification.crop === "maize"
        ? predictMaizeImage(file, predictionAdapters.maize, signal)
        : predictWheatImage(file, predictionAdapters.wheat, signal);
    })();
  }

  return crop === "maize"
    ? predictMaizeImage(file, predictionAdapters.maize, signal)
    : predictWheatImage(file, predictionAdapters.wheat, signal);
}

export function identifyCrop(file: File, signal?: AbortSignal) {
  return identifyCropRequest(file, cropIdentifierAdapter, signal);
}
