import { defineStore } from "pinia";

export interface VideoEffectResult {
  id: string; // clientId
  path: string;
  template: string;
  timestamp: number;
  model: string;
  thumbnail?: string; // Optional: preview thumbnail path/url
}

interface VideoEffectsState {
  results: VideoEffectResult[];
}

export const useVideoEffectsStore = defineStore("videoEffects", {
  state: (): VideoEffectsState => ({
    results: [],
  }),
  actions: {
    addResult(result: VideoEffectResult) {
      this.results.unshift(result);
    },
    clearResults() {
      this.results = [];
    }
  },
});
