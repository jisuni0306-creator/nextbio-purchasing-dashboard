"use client";

import { useCallback, useEffect, useState } from "react";
import { SAMPLE_SLOTS, type Slot } from "./racks";

const KEY = "rack-slots-v2";

export function useRackSlots() {
  const [slots, setSlots] = useState<Slot[]>(SAMPLE_SLOTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setSlots(parsed);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(slots));
    } catch {
      /* ignore */
    }
  }, [slots, hydrated]);

  const reset = useCallback(() => setSlots(SAMPLE_SLOTS), []);

  return { slots, hydrated, setSlots, reset };
}
