import { create } from 'zustand';
import { NextStep } from '../types/app';

interface LearningState {
  currentStep: NextStep | null;
  loading: boolean;
  setCurrentStep: (step: NextStep | null) => void;
  setLoading: (loading: boolean) => void;
  clearCurrentStep: () => void;
}

export const useLearningStore = create<LearningState>((set) => ({
  currentStep: null,
  loading: false,
  setCurrentStep: (step) => set({ currentStep: step }),
  setLoading: (loading) => set({ loading }),
  clearCurrentStep: () => set({ currentStep: null }),
}));
