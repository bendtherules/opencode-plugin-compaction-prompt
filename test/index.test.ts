import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CompactionPromptPlugin } from "../src/index.js";

const temporaryDirectories: string[] = [];

afterEach(async (): Promise<void> => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

async function createContext(): Promise<{
  worktree: string;
  logs: Array<unknown>;
  client: { app: { log: (input: unknown) => Promise<void> } };
}> {
  const worktree = await mkdtemp(
    path.join(os.tmpdir(), "opencode-compaction-"),
  );
  temporaryDirectories.push(worktree);
  const logs: Array<unknown> = [];

  return {
    worktree,
    logs,
    client: {
      app: {
        log: async (input: unknown): Promise<void> => {
          logs.push(input);
        },
      },
    },
  };
}

describe("CompactionPromptPlugin", () => {
  test("appends instructions and memory by default", async () => {
    const context = await createContext();
    await mkdir(path.join(context.worktree, ".opencode"));
    await writeFile(
      path.join(context.worktree, ".opencode/compaction.md"),
      "Keep the active hypothesis.",
    );
    const hooks = await CompactionPromptPlugin(context as never);
    const output = { context: [] as string[] };

    await hooks["experimental.session.compacting"]?.(
      { sessionID: "test" },
      output,
    );

    expect(output.context[0]).toContain("Keep the active hypothesis.");
    expect(output.context[0]).toContain(
      "opencode-plugin-compaction-prompt: Custom compaction done.",
    );
  });

  test("combines custom instructions with a configured memory file", async () => {
    const context = await createContext();
    await writeFile(
      path.join(context.worktree, "project-memory.md"),
      "Preserve the active hypothesis.",
    );
    const hooks = await CompactionPromptPlugin(context as never, {
      memoryFile: "project-memory.md",
      prompt: "Keep exact file paths.",
      completionMarker: "Compaction complete.",
    });
    const output = { context: ["Existing context"] };

    await hooks["experimental.session.compacting"]?.(
      { sessionID: "test" },
      output,
    );

    expect(output.context).toHaveLength(2);
    expect(output.context[0]).toBe("Existing context");
    expect(output.context[1]).toContain("Keep exact file paths.");
    expect(output.context[1]).toContain("Preserve the active hypothesis.");
    expect(output.context[1]).toContain("Compaction complete.");
  });

  test("supports replacing the default prompt", async () => {
    const context = await createContext();
    const hooks = await CompactionPromptPlugin(context as never, {
      mode: "replace",
      prompt: "Preserve the current implementation plan.",
    });
    const output: { context: string[]; prompt?: string } = { context: [] };

    await hooks["experimental.session.compacting"]?.(
      { sessionID: "test" },
      output,
    );

    expect(output.prompt).toContain("User Compaction Instructions");
    expect(output.prompt).toContain(
      "Preserve the current implementation plan.",
    );
    expect(output.context).toHaveLength(0);
  });

  test("ignores a missing memory file", async () => {
    const context = await createContext();
    const hooks = await CompactionPromptPlugin(context as never);
    const output = { context: [] as string[] };

    await hooks["experimental.session.compacting"]?.(
      { sessionID: "test" },
      output,
    );

    expect(context.logs).toHaveLength(0);
    expect(output.context).toEqual([
      "opencode-plugin-compaction-prompt: No custom compaction applied.",
    ]);
  });

  test("adds a skipped marker when no instructions are provided", async () => {
    const context = await createContext();
    const hooks = await CompactionPromptPlugin(context as never);
    const output: { context: string[]; prompt?: string } = {
      context: ["Existing context"],
    };

    await hooks["experimental.session.compacting"]?.(
      { sessionID: "test" },
      output,
    );

    expect(output.context).toEqual([
      "Existing context",
      "opencode-plugin-compaction-prompt: No custom compaction applied.",
    ]);
    expect(output.prompt).toBeUndefined();
  });

  test("logs non-missing memory file errors without failing compaction", async () => {
    const context = await createContext();
    await writeFile(path.join(context.worktree, "memory"), "not a directory");
    const hooks = await CompactionPromptPlugin(context as never, {
      memoryFile: "memory/file.md",
    });
    const output = { context: [] as string[] };

    await hooks["experimental.session.compacting"]?.(
      { sessionID: "test" },
      output,
    );

    expect(context.logs).toHaveLength(1);
    expect(output.context).toEqual([
      "opencode-plugin-compaction-prompt: No custom compaction applied.",
    ]);
  });
});
