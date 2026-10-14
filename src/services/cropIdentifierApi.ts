import { CROP_IDENTIFIER_API_HEALTH_URL, CROP_IDENTIFIER_API_URL } from "../lib/env";
import {
  ApiClientError,
  apiResponseError,
  fetchApiResponse,
  readApiJson,
  requestHealth,
  validateImageFile,
  type HealthApiAdapter,
} from "./apiClient";
import type { Crop } from "../types/prediction";

export interface CropIdentifierApiAdapter {
  createRequest(file: File): RequestInit;
  parseResponse(payload: unknown): { crop: Crop; confidence: number };
}

export function identifyCrop(
  file: File,
  adapter?: CropIdentifierApiAdapter,
  signal?: AbortSignal,
): Promise<
  | { ok: true; crop: Crop; confidence: number }
  | { ok: false; message: string; status?: number }
> {
  const invalid = validateImageFile(file);
  if (invalid) return Promise.resolve({ ok: false, message: invalid });
  if (!CROP_IDENTIFIER_API_URL) {
    return Promise.resolve({
      ok: false,
      message: "API endpoint not configured yet.",
    });
  }
  if (!adapter) {
    return Promise.resolve({
      ok: false,
      message: "API integration details are required before this endpoint can be called.",
    });
  }

  return (async () => {
    try {
      const response = await fetchApiResponse(
        CROP_IDENTIFIER_API_URL,
        adapter.createRequest(file),
        90_000,
        signal,
      );
      const payload = await readApiJson(response);
      if (!response.ok) {
        return {
          ok: false as const,
          message: apiResponseError(payload, response.status),
          status: response.status,
        };
      }
      const result = adapter.parseResponse(payload);
      if (
        (result.crop !== "maize" && result.crop !== "wheat") ||
        !Number.isFinite(result.confidence) ||
        result.confidence < 0 ||
        result.confidence > 1
      ) {
        throw new ApiClientError("The crop identifier adapter returned an invalid result.");
      }
      return { ok: true as const, ...result };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Crop identification failed.",
        status: error instanceof ApiClientError ? error.status : undefined,
      };
    }
  })();
}

export function checkCropIdentifierApiHealth(adapter?: HealthApiAdapter) {
  return requestHealth(
    CROP_IDENTIFIER_API_URL,
    CROP_IDENTIFIER_API_HEALTH_URL,
    adapter,
  );
}
