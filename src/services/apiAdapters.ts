import type { Crop, PredictionResult } from "../types/prediction";
import {
  ApiClientError,
  type PredictionApiAdapter,
} from "./apiClient";
import type { CropIdentifierApiAdapter } from "./cropIdentifierApi";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiClientError(`The API response is missing a valid ${field}.`);
  }
  return value;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiClientError(`The API response is missing a valid ${field}.`);
  }
  return value.trim();
}

function asProbabilities(value: unknown): Record<string, number> {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    throw new ApiClientError("The API response is missing class probabilities.");
  }
  const probabilities: Record<string, number> = {};
  for (const [label, score] of Object.entries(value)) {
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0) {
      throw new ApiClientError("The API returned invalid class probabilities.");
    }
    probabilities[label] = score;
  }
  return probabilities;
}

function createFileRequest(file: File): RequestInit {
  const body = new FormData();
  body.append("file", file, file.name);
  return { method: "POST", body };
}

export const cropIdentifierAdapter: CropIdentifierApiAdapter = {
  createRequest: createFileRequest,
  parseResponse(payload) {
    if (!isRecord(payload)) {
      throw new ApiClientError("The crop identifier returned an invalid response.");
    }
    const cropName = asString(payload.predicted_crop, "predicted crop").toLowerCase();
    const crop: Crop | null =
      cropName === "maize" || cropName === "corn"
        ? "maize"
        : cropName === "wheat"
          ? "wheat"
          : null;
    if (!crop) {
      throw new ApiClientError(
        `The image was identified as "${cropName}", not Maize/Corn or Wheat. No disease model was run.`,
      );
    }

    const rawConfidence = asFiniteNumber(payload.confidence, "crop confidence");
    const confidence =
      payload.confidence_unit === "percent" || rawConfidence > 1
        ? rawConfidence / 100
        : rawConfidence;
    return { crop, confidence };
  },
};

function normalizeImage(value: unknown, formatValue: unknown): {
  dataUrl: string | null;
  base64: string | null;
  format: string | null;
} {
  if (typeof value !== "string" || value.trim() === "") {
    return { dataUrl: null, base64: null, format: null };
  }
  const image = value.trim();
  const dataUrlMatch = /^data:([^;,]+);base64,(.*)$/s.exec(image);
  if (dataUrlMatch) {
    return {
      dataUrl: image,
      base64: dataUrlMatch[2],
      format: dataUrlMatch[1],
    };
  }
  const format =
    typeof formatValue === "string" && formatValue.trim() !== ""
      ? formatValue.trim()
      : "image/png";
  return {
    dataUrl: `data:${format};base64,${image}`,
    base64: image,
    format,
  };
}

function parseDiseasePrediction(
  payload: unknown,
  crop: Crop,
  classField: "predicted_disease" | "predicted_class",
  heatmapField: "heatmap_image" | "heatmap_base64",
  overlayField: "overlay_image" | "overlay_base64",
): PredictionResult {
  if (!isRecord(payload)) {
    throw new ApiClientError("The disease detection API returned an invalid response.");
  }

  const predictedClass = asString(payload[classField], "predicted disease");
  const rawConfidence = asFiniteNumber(payload.confidence, "prediction confidence");
  const confidence =
    payload.confidence_unit === "percent" || rawConfidence > 1
      ? rawConfidence / 100
      : rawConfidence;
  const confidencePercent =
    payload.confidence_percent === undefined
      ? confidence * 100
      : asFiniteNumber(payload.confidence_percent, "confidence percent");
  const heatmap = normalizeImage(payload[heatmapField], payload.heatmap_format);
  const overlay = normalizeImage(payload[overlayField], payload.heatmap_format);
  const timestamp =
    typeof payload.prediction_timestamp === "string"
      ? payload.prediction_timestamp
      : typeof payload.timestamp === "string"
        ? payload.timestamp
        : null;

  return {
    crop,
    predictedClass,
    confidence,
    confidencePercent,
    probabilities: asProbabilities(payload.probabilities),
    model: typeof payload.model === "string" ? payload.model : undefined,
    success: typeof payload.success === "boolean" ? payload.success : undefined,
    heatmapBase64: heatmap.base64,
    overlayBase64: overlay.base64,
    heatmapFormat: heatmap.format ?? overlay.format,
    heatmap: heatmap.dataUrl,
    overlay: overlay.dataUrl,
    explanation:
      typeof payload.heatmap_note === "string"
        ? payload.heatmap_note
        : typeof payload.explanation === "string"
          ? payload.explanation
          : null,
    timestamp,
    raw: payload,
  };
}

export const maizePredictionAdapter: PredictionApiAdapter = {
  createRequest: createFileRequest,
  parseResponse(payload) {
    return parseDiseasePrediction(
      payload,
      "maize",
      "predicted_disease",
      "heatmap_image",
      "overlay_image",
    );
  },
};

export const wheatPredictionAdapter: PredictionApiAdapter = {
  createRequest: createFileRequest,
  parseResponse(payload) {
    return parseDiseasePrediction(
      payload,
      "wheat",
      "predicted_class",
      "heatmap_base64",
      "overlay_base64",
    );
  },
};
