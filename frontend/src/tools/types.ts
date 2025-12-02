/**
 * Learning Tool Types
 *
 * Core type definitions for the learning tool registry system.
 * Each tool self-describes its capabilities, schema, and renderer.
 */

import { Step } from '../types/app';

/**
 * Result returned when a user completes a step
 */
export interface CompletionResult {
  /** Score from 0-100 for scored tools (quiz, practice) */
  score?: number;
  /** User's response/answer */
  userAnswer?: string;
  /** Additional tool-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Context available to tool renderers
 */
export interface ToolContext {
  /** The full step data */
  step: Step;
  /** Learning path ID */
  pathId: string;
  /** Called when user completes the step */
  onComplete: (result: CompletionResult) => Promise<void>;
  /** Loading state during completion */
  isCompleting: boolean;
}

/**
 * Props passed to every tool renderer component
 */
export interface ToolRendererProps<TData = unknown> {
  /** Tool-specific data extracted from step */
  data: TData;
  /** Context with step info and callbacks */
  context: ToolContext;
}

/**
 * Tool metadata for display and LLM prompts
 */
export interface ToolMetadata {
  /** Unique tool identifier (e.g., 'quiz', 'lesson') */
  id: string;
  /** Display name */
  name: string;
  /** Emoji icon */
  icon: string;
  /** Brief description for LLM tool selection */
  description: string;
  /** Badge color key from theme */
  badgeColor: string;
  /** Whether this tool can be embedded in other tools */
  embeddable: boolean;
  /** Target completion time in minutes */
  targetMinutes: number;
}

/**
 * JSON Schema type (simplified for our use case)
 */
export interface JSONSchema {
  $schema?: string;
  $id?: string;
  type: 'object' | 'string' | 'number' | 'array' | 'boolean';
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  description?: string;
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'array' | 'boolean' | 'object';
  description?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

/**
 * Main Learning Tool interface
 *
 * Each tool must implement this interface to be registered.
 */
export interface LearningTool<TData = unknown> {
  /** Tool metadata */
  metadata: ToolMetadata;

  /**
   * JSON Schema for LLM output validation
   * Used by backend to validate LLM responses
   */
  schema: JSONSchema;

  /**
   * React component that renders this tool's UI
   */
  Renderer: React.ComponentType<ToolRendererProps<TData>>;

  /**
   * Extract tool-specific data from a Step object
   */
  extractData: (step: Step) => TData;

  /**
   * Validate that data matches expected shape
   */
  validate: (data: unknown) => data is TData;
}

/**
 * Tool registry interface
 */
export interface ToolRegistry {
  /** Register a new tool */
  register: <TData>(tool: LearningTool<TData>) => void;

  /** Get tool by ID */
  get: (id: string) => LearningTool | undefined;

  /** Get all registered tools */
  getAll: () => LearningTool[];

  /** Check if tool exists */
  has: (id: string) => boolean;

  /** Get tool metadata for LLM prompts */
  getToolDescriptions: () => string;
}
