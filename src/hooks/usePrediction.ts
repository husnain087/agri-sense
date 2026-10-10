import { useCallback, useRef, useState } from "react";
import { predictLeafImage, validateImageFile } from "../services/api";
import type { PredictionResult } from "../types/prediction";

export function usePrediction() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const clearPreview = useCallback(() => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setFile(null);
    clearPreview();
    setResult(null);
    setError(null);
    setLoading(false);
  }, [clearPreview]);

  const selectFile = useCallback(
    (next: File | null) => {
      setResult(null);
      setError(null);
      if (!next) {
        setFile(null);
        clearPreview();
        return;
      }
      const invalid = validateImageFile(next);
      if (invalid) {
        setFile(null);
        clearPreview();
        setError(invalid);
        return;
      }
      setFile(next);
      clearPreview();
      setPreviewUrl(URL.createObjectURL(next));
    },
    [clearPreview],
  );

  const runPrediction = useCallback(async () => {
    if (!file) {
      setError("Choose a wheat-leaf image before running detection.");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setResult(null);
    const outcome = await predictLeafImage(file, controller.signal);
    if (controller.signal.aborted) return;
    setLoading(false);
    if (!outcome.ok) {
      setError(outcome.message);
      return;
    }
    setResult(outcome.result);
  }, [file]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  return {
    file,
    previewUrl,
    result,
    error,
    loading,
    selectFile,
    runPrediction,
    cancel,
    reset,
  };
}
