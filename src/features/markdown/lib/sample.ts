export const SAMPLE_MARKDOWN = `# Release notes

Welcome to the **Markdown Viewer**. Edit on the left, see the result on the right — your text is
saved in this browser as you type. Use *Export* to download it as Markdown, HTML or PDF.

## What's new

- Live preview with GitHub-flavoured markdown
- Syntax-highlighted code blocks
- ~~Manual saving~~ autosave, so nothing gets lost
- Links like https://example.com turn into links automatically

### Launch checklist

- [x] Write the changelog
- [x] Review the API docs
- [ ] Announce in #releases
- [ ] Celebrate

## Performance

| Metric        | Before | After  | Change |
| ------------- | -----: | -----: | :----: |
| First load    | 2.4 s  | 1.1 s  | −54%   |
| Bundle size   | 412 kB | 268 kB | −35%   |
| Lighthouse    | 71     | 96     | +25    |

## Code

\`\`\`ts
interface Tool {
  id: string
  name: string
  path: string
}

export function findTool(tools: Tool[], path: string): Tool | undefined {
  return tools.find((tool) => tool.path === path)
}
\`\`\`

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

Inline code works too: \`const answer = 42\`.

> Markdown is intended to be as easy-to-read and easy-to-write as is feasible.
>
> — John Gruber

1. Numbered lists
2. Work as expected
   - and can nest

---

Read the [Markdown guide](https://www.markdownguide.org/) to learn more.
`
