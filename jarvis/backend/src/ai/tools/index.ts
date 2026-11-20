import type { Tool, ToolRegistry } from "../../core/types.js";
import { builtinTools } from "./builtin.js";

export function createToolRegistry(): ToolRegistry {
  const map = new Map<string, Tool>();
  const registry: ToolRegistry = {
    register(tool) {
      map.set(tool.name, tool);
    },
    list: () => [...map.values()],
    get: (name) => map.get(name),
  };
  for (const t of builtinTools) registry.register(t);
  return registry;
}
