import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Hooks, Plugin, PluginOptions } from "@opencode-ai/plugin";

type CompactionMode = "append" | "replace";

export type CompactionOptions = PluginOptions & {
  memoryFile?: unknown;
  mode?: unknown;
  prompt?: unknown;
  completionMarker?: unknown;
};

const defaultMemoryFile = ".opencode/compaction.md";
const defaultPrompt = "";
const defaultCompletionMarker = "Custom compaction request honored.";

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue || undefined;
}

function buildInstructions(
  prompt: string,
  completionMarker: string,
  memory: string,
): string | undefined {
  if (!prompt && !memory) {
    return undefined;
  }

  const sections = [
    "## User Compaction Instructions",
    `These instructions take precedence over previous instructions if there is conflict. At the very end of the summary, echo exactly: **${completionMarker}**`,
    prompt,
  ];

  if (memory) {
    sections.push(memory);
  }

  return sections.join("\n");
}

async function readMemory(
  memoryPath: string,
  logError: (message: string) => Promise<void>,
): Promise<string> {
  try {
    return (await readFile(memoryPath, "utf8")).trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      await logError(`Unable to read compaction memory file: ${memoryPath}`);
    }

    return "";
  }
}

/**
 * Adds configured instructions and optional project memory to OpenCode's
 * compaction prompt.
 *
 * Append mode preserves OpenCode's built-in compaction prompt and adds the
 * plugin instructions as context. Replace mode supplies a complete prompt
 * containing the plugin instructions instead. The memory file is resolved
 * relative to the active worktree and may be absent.
 *
 * @example
 * ```json
 * {
 *   "plugin": [["opencode-plugin-compaction-prompt", {
 *     "memoryFile": ".opencode/compaction.md",
 *     "mode": "append"
 *   }]]
 * }
 * ```
 *
 * @param context OpenCode's plugin context, including the active worktree.
 * @param options User-provided plugin configuration.
 * @returns The hooks registered by the plugin.
 */
export const CompactionPromptPlugin: Plugin = async (
  context,
  options?: PluginOptions,
): Promise<Hooks> => {
  const configured = (options ?? {}) as CompactionOptions;
  const memoryFile = asString(configured.memoryFile) ?? defaultMemoryFile;
  const prompt = asString(configured.prompt) ?? defaultPrompt;
  const completionMarker =
    asString(configured.completionMarker) ?? defaultCompletionMarker;
  const mode: CompactionMode =
    configured.mode === "replace" ? "replace" : "append";
  const memoryPath = path.resolve(context.worktree, memoryFile);
  const logError = async (message: string): Promise<void> => {
    await context.client.app.log({
      body: {
        level: "error",
        message,
        service: "opencode-plugin-compaction-prompt",
      },
    });
  };

  return {
    "experimental.session.compacting": async (
      _input,
      output,
    ): Promise<void> => {
      const memory = await readMemory(memoryPath, logError);
      const instructions = buildInstructions(prompt, completionMarker, memory);

      if (!instructions) {
        return;
      }

      if (mode === "replace") {
        output.prompt = instructions;
      } else {
        output.context.push(instructions);
      }
    },
  };
};
