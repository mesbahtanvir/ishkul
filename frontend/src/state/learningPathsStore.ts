import { create } from 'zustand';
import { LearningPath, Step } from '../types/app';

interface LearningPathsState {
  paths: LearningPath[];
  activePath: LearningPath | null;
  loading: boolean;
  error: string | null;

  // Actions
  setPaths: (paths: LearningPath[]) => void;
  setActivePath: (path: LearningPath | null) => void;
  addPath: (path: LearningPath) => void;
  updatePath: (pathId: string, updates: Partial<LearningPath>) => void;
  deletePath: (pathId: string) => void;
  addStep: (pathId: string, step: Step) => void;
  updateStep: (pathId: string, stepId: string, updates: Partial<Step>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearPaths: () => void;
}

// Helper to find current (incomplete) step
export const getCurrentStep = (steps: Step[]): Step | null => {
  return steps.find((s) => !s.completed) || null;
};

// Helper to get completed steps
export const getCompletedSteps = (steps: Step[]): Step[] => {
  return steps.filter((s) => s.completed);
};

export const useLearningPathsStore = create<LearningPathsState>((set, get) => ({
  paths: [],
  activePath: null,
  loading: false,
  error: null,

  setPaths: (paths) => {
    // Sort by lastAccessedAt descending (most recent first)
    const sortedPaths = [...paths].sort(
      (a, b) => b.lastAccessedAt - a.lastAccessedAt
    );
    set({ paths: sortedPaths });
  },

  setActivePath: (path) => set({ activePath: path }),

  addPath: (path) => {
    const { paths } = get();
    set({ paths: [path, ...paths] });
  },

  updatePath: (pathId, updates) => {
    const { paths, activePath } = get();
    const updatedPaths = paths.map((p) =>
      p.id === pathId ? { ...p, ...updates, updatedAt: Date.now() } : p
    );
    // Re-sort after update
    updatedPaths.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    set({
      paths: updatedPaths,
      activePath:
        activePath?.id === pathId
          ? { ...activePath, ...updates, updatedAt: Date.now() }
          : activePath,
    });
  },

  deletePath: (pathId) => {
    const { paths, activePath } = get();
    set({
      paths: paths.filter((p) => p.id !== pathId),
      activePath: activePath?.id === pathId ? null : activePath,
    });
  },

  addStep: (pathId, step) => {
    const { paths, activePath } = get();
    const updatedPaths = paths.map((p) => {
      if (p.id === pathId) {
        return { ...p, steps: [...p.steps, step] };
      }
      return p;
    });
    set({
      paths: updatedPaths,
      activePath:
        activePath?.id === pathId
          ? { ...activePath, steps: [...activePath.steps, step] }
          : activePath,
    });
  },

  updateStep: (pathId, stepId, updates) => {
    const { paths, activePath } = get();
    const updateSteps = (steps: Step[]) =>
      steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s));

    const updatedPaths = paths.map((p) => {
      if (p.id === pathId) {
        return { ...p, steps: updateSteps(p.steps) };
      }
      return p;
    });

    set({
      paths: updatedPaths,
      activePath:
        activePath?.id === pathId
          ? { ...activePath, steps: updateSteps(activePath.steps) }
          : activePath,
    });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearPaths: () => set({ paths: [], activePath: null, error: null }),
}));

// Helper function to generate emoji based on goal
export const getEmojiForGoal = (goal: string): string => {
  const lowerGoal = goal.toLowerCase();

  // Programming languages
  if (lowerGoal.includes('python')) return '🐍';
  if (lowerGoal.includes('javascript') || lowerGoal.includes('js')) return '💛';
  if (lowerGoal.includes('typescript') || lowerGoal.includes('ts')) return '💙';
  if (lowerGoal.includes('java') && !lowerGoal.includes('javascript')) return '☕';
  if (lowerGoal.includes('rust')) return '🦀';
  if (lowerGoal.includes('go') || lowerGoal.includes('golang')) return '🐹';
  if (lowerGoal.includes('swift')) return '🍎';
  if (lowerGoal.includes('kotlin')) return '🟣';
  if (lowerGoal.includes('c++') || lowerGoal.includes('cpp')) return '⚡';
  if (lowerGoal.includes('ruby')) return '💎';
  if (lowerGoal.includes('php')) return '🐘';

  // Web development
  if (lowerGoal.includes('react')) return '⚛️';
  if (lowerGoal.includes('web') || lowerGoal.includes('html') || lowerGoal.includes('css')) return '🌐';
  if (lowerGoal.includes('node')) return '🟢';

  // Data & AI
  if (lowerGoal.includes('machine learning') || lowerGoal.includes('ml')) return '🤖';
  if (lowerGoal.includes('data science') || lowerGoal.includes('data analysis')) return '📊';
  if (lowerGoal.includes('ai') || lowerGoal.includes('artificial intelligence')) return '🧠';

  // Other tech
  if (lowerGoal.includes('database') || lowerGoal.includes('sql')) return '🗄️';
  if (lowerGoal.includes('cloud') || lowerGoal.includes('aws') || lowerGoal.includes('azure')) return '☁️';
  if (lowerGoal.includes('devops') || lowerGoal.includes('docker') || lowerGoal.includes('kubernetes')) return '🐳';
  if (lowerGoal.includes('security') || lowerGoal.includes('cyber')) return '🔒';
  if (lowerGoal.includes('mobile') || lowerGoal.includes('app')) return '📱';

  // Languages
  if (lowerGoal.includes('spanish')) return '🇪🇸';
  if (lowerGoal.includes('french')) return '🇫🇷';
  if (lowerGoal.includes('german')) return '🇩🇪';
  if (lowerGoal.includes('japanese')) return '🇯🇵';
  if (lowerGoal.includes('chinese') || lowerGoal.includes('mandarin')) return '🇨🇳';
  if (lowerGoal.includes('korean')) return '🇰🇷';
  if (lowerGoal.includes('language')) return '🗣️';

  // Skills
  if (lowerGoal.includes('cook') || lowerGoal.includes('culinary') || lowerGoal.includes('recipe')) return '🍳';
  if (lowerGoal.includes('music') || lowerGoal.includes('piano') || lowerGoal.includes('instrument')) return '🎵';
  if (lowerGoal.includes('guitar')) return '🎸';
  if (lowerGoal.includes('draw') || lowerGoal.includes('art') || lowerGoal.includes('paint')) return '🎨';
  if (lowerGoal.includes('photo')) return '📷';
  if (lowerGoal.includes('write') || lowerGoal.includes('writing')) return '✍️';
  if (lowerGoal.includes('design')) return '🎨';
  if (lowerGoal.includes('math')) return '🔢';
  if (lowerGoal.includes('physics')) return '⚛️';
  if (lowerGoal.includes('chemistry')) return '🧪';
  if (lowerGoal.includes('biology')) return '🧬';
  if (lowerGoal.includes('history')) return '📜';
  if (lowerGoal.includes('business') || lowerGoal.includes('entrepreneur')) return '💼';
  if (lowerGoal.includes('finance') || lowerGoal.includes('invest')) return '💰';
  if (lowerGoal.includes('fitness') || lowerGoal.includes('exercise') || lowerGoal.includes('workout')) return '💪';
  if (lowerGoal.includes('yoga') || lowerGoal.includes('meditation')) return '🧘';

  // Default
  return '📚';
};

// Helper to generate unique ID
export const generatePathId = (): string => {
  return `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
