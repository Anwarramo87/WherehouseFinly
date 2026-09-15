"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Which factory the overseer is currently looking at.
 *
 * When set, every API call carries it as `x-factory-id` and the backend runs the
 * ordinary handlers narrowed to that factory — so the overseer sees the same
 * employees, payroll and attendance pages a factory admin would, without a
 * parallel set of screens existing to drift out of step.
 *
 * Persisted so a page refresh does not silently drop the overseer back to the
 * platform-wide view while the header still says otherwise.
 */
type FactoryScopeState = {
  factoryId: string | null;
  factoryName: string | null;
  enter: (factoryId: string, factoryName: string) => void;
  leave: () => void;
};

export const useFactoryScopeStore = create<FactoryScopeState>()(
  persist(
    (set) => ({
      factoryId: null,
      factoryName: null,
      enter: (factoryId, factoryName) => set({ factoryId, factoryName }),
      leave: () => set({ factoryId: null, factoryName: null }),
    }),
    {
      name: "factory-scope-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * Read without subscribing — for the axios interceptor, which runs outside React
 * and must not hold a component subscription.
 */
export const getActiveFactoryId = (): string | null => {
  try {
    return useFactoryScopeStore.getState().factoryId;
  } catch {
    return null;
  }
};
