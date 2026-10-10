import { useCallback, useEffect, useState } from "react";
import { checkBackendHealth } from "../services/api";
import type { HealthInfo } from "../types/prediction";

const POLL_MS = 30_000;

const initial: HealthInfo = {
  status: "checking",
  message: "Checking backend status…",
};

export function useBackendStatus() {
  const [health, setHealth] = useState<HealthInfo>(initial);

  const refresh = useCallback(async () => {
    setHealth((current) => ({
      ...current,
      status: "checking",
      message: "Checking backend status…",
    }));
    const next = await checkBackendHealth();
    setHealth(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const next = await checkBackendHealth();
      if (!cancelled) setHealth(next);
    };
    void run();
    const id = window.setInterval(() => {
      void run();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return { health, refresh };
}
