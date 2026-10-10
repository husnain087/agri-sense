import { MAIZE_API_BASE_URL } from "../lib/env";

const MAIZE_TIMEOUT_MS = 90_000;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg"];

export interface MaizePredictionResult {
  predictedClass: string;
  confidence: number;
  confidencePercent: number;
  probabilities: Record<string, number>;
  heatmapBase64?: string | null;
  overlayBase64?: string | null;
  heatmapFormat?: string | null;
  predictionTimestamp?: string | null;
  raw: Record<string, unknown>;
}

export interface MaizePredictOk {
  ok: true;
  result: MaizePredictionResult;
}

export interface MaizePredictErr {
  ok: false;
  message: string;
  status?: number;
}

export type MaizePredictOutcome = MaizePredictOk | MaizePredictErr;

export function validateMaizeImageFile(file: File): string | null {
  const acceptedExtensions = [".jpg", ".jpeg", ".png"];
  const typeOk =
    ACCEPTED_TYPES.includes(file.type) ||
    acceptedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

  if (!typeOk) {
    return "Please choose a JPG, JPEG, or PNG image for maize disease detection.";
  }
  if (file.size <= 0) {
    return "The selected file is empty.";
  }
  if (file.size > 8 * 1024 * 1024) {
    return "Please choose a maize image smaller than 8 MB.";
  }

  return null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    if (controller.signal.aborted && signal?.aborted) {
      throw new Error("The request was cancelled.");
    }
    if (controller.signal.aborted) {
      throw new Error(
        `The maize model request timed out after ${Math.round(timeoutMs / 1000)} seconds. The local backend may be starting up.`
      );
    }
    throw new Error("The maize backend is not responding. Check that the local FastAPI server is running.");
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function predictMaizeImage(file: File, signal?: AbortSignal): Promise<MaizePredictOutcome> {
  const validationError = validateMaizeImageFile(file);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const body = new FormData();
  body.append("file", file);

  try {
    const response = await fetchWithTimeout(
      `${MAIZE_API_BASE_URL}/predict-maize`,
      { method: "POST", body },
      MAIZE_TIMEOUT_MS,
      signal,
    );
    const payload = await response.json();

    if (!response.ok) {
      const detail =
        typeof payload?.detail === "string"
          ? payload.detail
          : "The maize prediction backend rejected the request.";
      return { ok: false, message: detail, status: response.status };
    }

    if (!isRecord(payload)) {
      return { ok: false, message: "The maize backend returned an unexpected response." };
    }

    const predictedClass =
      typeof payload.predicted_class === "string" && payload.predicted_class
        ? payload.predicted_class
        : "";
    if (!predictedClass) {
      return { ok: false, message: "The maize backend did not return a predicted class." };
    }

    const probabilities = parseProbabilities(payload.probabilities);
    const confidenceFromField = asFiniteNumber(payload.confidence);
    const percentFromField = asFiniteNumber(payload.confidence_percent);
    const confidence = confidenceFromField ?? 0;
    const confidencePercent = percentFromField ?? confidence * 100;

    return {
      ok: true,
      result: {
        predictedClass,
        confidence,
        confidencePercent,
        probabilities: probabilities ?? {},
        heatmapBase64: typeof payload.heatmap_base64 === "string" ? payload.heatmap_base64 : null,
        overlayBase64: typeof payload.overlay_base64 === "string" ? payload.overlay_base64 : null,
        heatmapFormat: typeof payload.heatmap_format === "string" ? payload.heatmap_format : null,
        predictionTimestamp:
          typeof payload.prediction_timestamp === "string" ? payload.prediction_timestamp : null,
        raw: payload,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prediction failed because of an unexpected client error.";
    return { ok: false, message };
  }
}
