import { API_BASE_URL } from "../lib/env";
import { KNOWN_CLASSES, type HealthInfo, type PredictOutcome, type PredictionResult } from "../types/prediction";

const HEALTH_TIMEOUT_MS = 12_000;
const PREDICT_TIMEOUT_MS = 90_000;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const FILE_LIMITS = {
  maxBytes: MAX_FILE_BYTES,
  acceptedTypes: ACCEPTED_TYPES,
  acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
};

export class ApiClientError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    if (controller.signal.aborted && signal?.aborted) {
      throw new ApiClientError("The request was cancelled.");
    }
    if (controller.signal.aborted) {
      throw new ApiClientError(
        `The request timed out after ${Math.round(timeoutMs / 1000)} seconds. The backend may be cold-starting — try again shortly.`,
      );
    }
    throw new ApiClientError(
      `Could not reach the local AgriSense AI backend at ${API_BASE_URL}. Start the wheat backend and retry.`,
    );
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiClientError(
      "The backend returned a non-JSON response.",
      response.status,
    );
  }
}

export function validateImageFile(file: File): string | null {
  const typeOk =
    ACCEPTED_TYPES.includes(file.type) ||
    FILE_LIMITS.acceptedExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );
  if (!typeOk) {
    return "Please choose a JPEG, PNG, or WEBP image of a wheat leaf.";
  }
  if (file.size <= 0) {
    return "The selected file is empty.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "Please choose an image smaller than 8 MB.";
  }
  return null;
}

function parseProbabilities(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.length === 0) return null;
  const probabilities: Record<string, number> = {};
  for (const [key, raw] of entries) {
    const num = asFiniteNumber(raw);
    if (num === null) return null;
    probabilities[key] = num;
  }
  return probabilities;
}

export function parsePredictionPayload(payload: unknown): PredictionResult {
  if (!isRecord(payload)) {
    throw new ApiClientError("The prediction response was not a JSON object.");
  }

  if (payload.success === false) {
    const message =
      typeof payload.error === "string"
        ? payload.error
        : typeof payload.message === "string"
          ? payload.message
          : "The backend reported that prediction failed.";
    throw new ApiClientError(message);
  }

  const predictedClass =
    (typeof payload.predicted_class === "string" && payload.predicted_class) ||
    (typeof payload.class === "string" && payload.class) ||
    (typeof payload.label === "string" && payload.label) ||
    "";

  if (!predictedClass) {
    throw new ApiClientError(
      "The prediction response did not include a predicted class.",
    );
  }

  const probabilities = parseProbabilities(payload.probabilities);
  const confidenceFromField = asFiniteNumber(payload.confidence);
  const percentFromField = asFiniteNumber(payload.confidence_percent);
  const heatmapBase64 =
    typeof payload.heatmap_base64 === "string" ? payload.heatmap_base64 : null;
  const overlayBase64 =
    typeof payload.overlay_base64 === "string" ? payload.overlay_base64 : null;
  const heatmapFormat =
    typeof payload.heatmap_format === "string" ? payload.heatmap_format : null;
  const explanation =
    typeof payload.explanation === "string" ? payload.explanation : null;
  const timestamp =
    typeof payload.prediction_timestamp === "string"
      ? payload.prediction_timestamp
      : typeof payload.timestamp === "string"
        ? payload.timestamp
        : typeof payload.created_at === "string"
          ? payload.created_at
          : null;

  const predictedProb =
    probabilities && asFiniteNumber(probabilities[predictedClass]);

  let confidence = confidenceFromField;
  if (confidence === null && predictedProb !== null) {
    confidence = predictedProb;
  }
  if (confidence === null && percentFromField !== null) {
    confidence = percentFromField > 1 ? percentFromField / 100 : percentFromField;
  }
  if (confidence === null) {
    throw new ApiClientError(
      "The prediction response did not include a usable confidence score.",
    );
  }

  let confidencePercent = percentFromField;
  if (confidencePercent === null) {
    confidencePercent = confidence <= 1 ? confidence * 100 : confidence;
  } else if (confidencePercent <= 1 && confidence <= 1) {
    confidencePercent = confidencePercent * 100;
  }

  if (
    probabilities &&
    !KNOWN_CLASSES.includes(predictedClass as (typeof KNOWN_CLASSES)[number])
  ) {
    console.error(
      "[AgriSense] Unexpected predicted class from backend:",
      predictedClass,
      payload,
    );
  }

  if (!probabilities) {
    console.error(
      "[AgriSense] Prediction response is missing a valid probabilities object.",
      payload,
    );
  }

  return {
    predictedClass,
    confidence,
    confidencePercent,
    probabilities: probabilities ?? {},
    model: typeof payload.model === "string" ? payload.model : undefined,
    success: typeof payload.success === "boolean" ? payload.success : undefined,
    heatmapBase64,
    overlayBase64,
    heatmapFormat,
    explanation,
    timestamp,
    raw: payload,
  };
}

export async function checkBackendHealth(): Promise<HealthInfo> {
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/health`,
      { method: "GET" },
      HEALTH_TIMEOUT_MS,
    );
    const payload = await readJson(response);
    if (!response.ok) {
      return {
        status: "offline",
        message: `Health check failed with HTTP ${response.status}.`,
        checkedAt,
      };
    }
    const record = isRecord(payload) ? payload : {};
    const modelLoaded =
      typeof record.model_loaded === "boolean" ? record.model_loaded : undefined;
    const healthy =
      record.status === "healthy" ||
      record.status === "ok" ||
      response.ok;

    if (!healthy) {
      return {
        status: "offline",
        message: "The health endpoint responded but did not report a healthy status.",
        modelLoaded,
        checkedAt,
      };
    }

    return {
      status: "online",
      message: modelLoaded === false ? "API reachable, model not loaded" : "API online",
      modelLoaded,
      checkedAt,
    };
  } catch (error) {
    const message =
      error instanceof ApiClientError
        ? error.message
        : "Health check failed.";
    return { status: "offline", message, checkedAt };
  }
}

export async function predictLeafImage(
  file: File,
  signal?: AbortSignal,
): Promise<PredictOutcome> {
  const validationError = validateImageFile(file);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const body = new FormData();
  body.append("file", file);

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/predict`,
      { method: "POST", body },
      PREDICT_TIMEOUT_MS,
      signal,
    );
    const payload = await readJson(response);

    if (!response.ok) {
      let detail = `Prediction failed with HTTP ${response.status}.`;
      if (isRecord(payload) && payload.detail) {
        if (typeof payload.detail === "string") {
          detail = payload.detail;
        } else if (Array.isArray(payload.detail)) {
          detail = "The backend rejected the uploaded file.";
        }
      }
      return { ok: false, message: detail, status: response.status };
    }

    const result = parsePredictionPayload(payload);
    return { ok: true, result };
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { ok: false, message: error.message, status: error.status };
    }
    return {
      ok: false,
      message: "Prediction failed because of an unexpected client error.",
    };
  }
}

export { API_BASE_URL };
