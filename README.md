# opencode-plugin-compaction-prompt

Customize OpenCode's compaction prompt to guide which context carries forward, which details are omitted, and what the next session should retain.

[GitHub](https://github.com/bendtherules/opencode-plugin-compaction-prompt) · [npm](https://www.npmjs.com/package/opencode-plugin-compaction-prompt)

## Install

```bash
opencode plugin opencode-plugin-compaction-prompt
```

Or add it to `opencode.json` manually:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-plugin-compaction-prompt",
      {
        "memoryFile": ".opencode/compaction.md",
        "mode": "append",
        "completionMarker": "Custom compaction request honored."
      }
    ]
  ]
}
```

Create `.opencode/compaction.md` in the project when you have project-specific context to preserve. The file is optional.

## Options

| Option             | Default                              | Description                                                                                                |
| ------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `memoryFile`       | `.opencode/compaction.md`            | File resolved relative to the active worktree.                                                             |
| `mode`             | `append`                             | Append instructions to OpenCode's default prompt, or use `replace` to provide a complete prompt.           |
| `prompt`           | Built-in preservation prompt         | Additional instructions used together with `memoryFile`; both are included in the compaction instructions. |
| `completionMarker` | `Custom compaction request honored.` | Exact text the model is asked to append at the end of the summary.                                         |

Append mode is the recommended default because it preserves OpenCode's built-in compaction behavior. Replace mode is available when the complete prompt needs to be controlled by this plugin.

## Development

```bash
bun install
bun test
bun run typecheck
bun run build
bun run pack:check
```

The npm package exposes the compiled entrypoint at `dist/index.js` and TypeScript declarations at `dist/index.d.ts`.

## Publishing

Before publishing a release:

```bash
bun run format:check
bun test
bun run typecheck
bun run build
bun run pack:check
npm publish
```

Update the version in `package.json` before each release. `npm publish` rebuilds `dist/` automatically.

## Compatibility

The plugin uses OpenCode's `experimental.session.compacting` hook. OpenCode may change experimental plugin APIs between releases; test the package against the OpenCode version you support.
