import { create } from 'zustand';
import { NextStep } from '../types/app';

interface LearningState {
  currentStep: NextStep | null;
  loading: boolean;
  error: string | null;
  setCurrentStep: (step: NextStep | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCurrentStep: () => void;
}

export const useLearningStore = create<LearningState>((set) => ({
  currentStep: null,
  loading: false,
  error: null,
  setCurrentStep: (step) => set({ currentStep: step }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearCurrentStep: () => set({ currentStep: null, error: null }),
}));
