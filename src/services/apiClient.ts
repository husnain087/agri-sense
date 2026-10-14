import type { Crop, HealthInfo, PredictionResult } from "../types/prediction";

const HEALTH_TIMEOUT_MS = 12_000;
const PREDICTION_TIMEOUT_MS = 90_000;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const FILE_LIMITS = {
  maxBytes: MAX_FILE_BYTES,
  acceptedTypes: ACCEPTED_TYPES,
  acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
};

export class ApiClientError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface PredictionApiAdapter {
  createRequest(file: File): RequestInit;
  parseResponse(payload: unknown, crop: Crop): PredictionResult;
}

export interface HealthApiAdapter {
  createRequest(): RequestInit;
}

export function validateImageFile(file: File): string | null {
  const typeOk =
    ACCEPTED_TYPES.includes(file.type) ||
    FILE_LIMITS.acceptedExtensions.some((extension) =>
      file.name.toLowerCase().endsWith(extension),
    );
  if (!typeOk) {
    return "Please choose a JPEG, PNG, or WEBP image of a wheat or maize leaf.";
  }
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > MAX_FILE_BYTES) {
    return "Please choose an image smaller than 8 MB.";
  }
  return null;
}

export async function fetchApiResponse(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    if (signal?.aborted) throw new ApiClientError("The request was cancelled.");
    if (controller.signal.aborted) {
      throw new ApiClientError(
        `The request timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
      );
    }
    throw new ApiClientError("Could not reach the configured API endpoint.");
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export async function readApiJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiClientError("The API returned a non-JSON response.", response.status);
  }
}

export function apiResponseError(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    const body = payload as Record<string, unknown>;
    for (const key of ["message", "error", "detail"]) {
      if (typeof body[key] === "string" && body[key]) return body[key];
    }
  }
  return `The API request failed with HTTP ${status}.`;
}

export async function requestPrediction(
  endpointUrl: string,
  file: File,
  crop: Crop,
  adapter: PredictionApiAdapter | undefined,
  signal?: AbortSignal,
): Promise<{ ok: true; result: PredictionResult } | { ok: false; message: string; status?: number }> {
  const invalid = validateImageFile(file);
  if (invalid) return { ok: false, message: invalid };
  if (!endpointUrl) {
    return { ok: false, message: "API endpoint not configured yet." };
  }
  if (!adapter) {
    return {
      ok: false,
      message: "API integration details are required before this endpoint can be called.",
    };
  }

  try {
    const response = await fetchApiResponse(
      endpointUrl,
      adapter.createRequest(file),
      PREDICTION_TIMEOUT_MS,
      signal,
    );
    const payload = await readApiJson(response);
    if (!response.ok) {
      return {
        ok: false,
        message: apiResponseError(payload, response.status),
        status: response.status,
      };
    }
    const result = adapter.parseResponse(payload, crop);
    if (
      result.crop !== crop ||
      typeof result.predictedClass !== "string" ||
      result.predictedClass.trim() === "" ||
      !Number.isFinite(result.confidence) ||
      result.confidence < 0 ||
      result.confidence > 1 ||
      !Number.isFinite(result.confidencePercent) ||
      result.confidencePercent < 0 ||
      result.confidencePercent > 100 ||
      typeof result.probabilities !== "object" ||
      result.probabilities === null ||
      Object.values(result.probabilities).some(
        (probability) => !Number.isFinite(probability) || probability < 0,
      )
    ) {
      throw new ApiClientError(
        "The prediction adapter returned an invalid prediction result.",
      );
    }
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "The API request failed.",
      status: error instanceof ApiClientError ? error.status : undefined,
    };
  }
}

export async function requestHealth(
  endpointUrl: string,
  healthUrl: string,
  adapter?: HealthApiAdapter,
): Promise<HealthInfo> {
  const checkedAt = new Date().toISOString();
  if (!endpointUrl) {
    return {
      status: "not-configured",
      message: "API endpoint not configured yet.",
      checkedAt,
    };
  }
  if (!healthUrl || !adapter) {
    return {
      status: "not-configured",
      message: "API endpoint is configured; health-check details are still required.",
      checkedAt,
    };
  }

  try {
    const response = await fetchApiResponse(
      healthUrl,
      adapter.createRequest(),
      HEALTH_TIMEOUT_MS,
    );
    return response.ok
      ? { status: "online", message: "API is responding.", checkedAt }
      : {
          status: "offline",
          message: `Health check failed with HTTP ${response.status}.`,
          checkedAt,
        };
  } catch (error) {
    return {
      status: "offline",
      message: error instanceof Error ? error.message : "Health check failed.",
      checkedAt,
    };
  }
}

export function unexpectedApiError(error: unknown): string {
  return error instanceof Error ? error.message : "The API request failed.";
}
