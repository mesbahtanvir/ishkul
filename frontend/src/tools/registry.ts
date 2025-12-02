/**
 * Learning Tool Registry
 *
 * Central registry for all learning tools. Tools register themselves
 * and can be looked up by ID for dynamic rendering.
 */

import { LearningTool, ToolRegistry } from './types';

/**
 * Internal storage for registered tools
 */
const tools = new Map<string, LearningTool>();

/**
 * Register a learning tool
 *
 * @param tool - The tool to register
 * @throws Error if tool with same ID already exists
 */
export function registerTool<TData>(tool: LearningTool<TData>): void {
  if (tools.has(tool.metadata.id)) {
    console.warn(
      `Tool "${tool.metadata.id}" is already registered. Skipping duplicate registration.`
    );
    return;
  }
  tools.set(tool.metadata.id, tool as LearningTool);
}

/**
 * Get a tool by its ID
 *
 * @param id - Tool identifier (e.g., 'quiz', 'lesson')
 * @returns The tool or undefined if not found
 */
export function getTool(id: string): LearningTool | undefined {
  return tools.get(id);
}

/**
 * Get all registered tools
 *
 * @returns Array of all tools
 */
export function getAllTools(): LearningTool[] {
  return Array.from(tools.values());
}

/**
 * Check if a tool is registered
 *
 * @param id - Tool identifier
 * @returns true if tool exists
 */
export function hasTool(id: string): boolean {
  return tools.has(id);
}

/**
 * Get tool descriptions for LLM prompts
 *
 * Returns a formatted string describing all available tools
 * for use in the tool selector prompt.
 *
 * @returns Formatted tool descriptions
 */
export function getToolDescriptions(): string {
  const descriptions: string[] = [];

  for (const tool of tools.values()) {
    const { id, name, icon, description, targetMinutes } = tool.metadata;
    descriptions.push(
      `- **${id}** (${icon} ${name}): ${description} [${targetMinutes} min]`
    );
  }

  return descriptions.join('\n');
}

/**
 * Get tool schemas for backend validation
 *
 * Returns all tool schemas as a map for backend use.
 *
 * @returns Map of tool ID to JSON schema
 */
export function getToolSchemas(): Record<string, object> {
  const schemas: Record<string, object> = {};

  for (const tool of tools.values()) {
    schemas[tool.metadata.id] = tool.schema;
  }

  return schemas;
}

/**
 * Clear all registered tools (useful for testing)
 */
export function clearRegistry(): void {
  tools.clear();
}

/**
 * Registry object for dependency injection
 */
export const toolRegistry: ToolRegistry = {
  register: registerTool,
  get: getTool,
  getAll: getAllTools,
  has: hasTool,
  getToolDescriptions,
};

export default toolRegistry;
