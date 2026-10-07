# haoyang-li.com

Source of [haoyang-li.com](https://haoyang-li.com), the personal site of Haoyang Li: case studies, a résumé, open source, and a work gallery that lives on a WebGL stage.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · next-intl (en / zh) · OGL · GSAP + Lenis · Vitest

## What's interesting in here

- **Particle hero** — [`components/motion/ParticleImage.tsx`](components/motion/ParticleImage.tsx). A photo redrawn by a few hundred thousand GPU particles drifting on curl noise, swept by the cursor. WebGL2 transform feedback, no dependencies. The particle count scales with the element's area, and the effect pauses off screen.
- **Ink-wash hero with a fluid cursor** — [`components/motion/Watercolor.tsx`](components/motion/Watercolor.tsx) and [`lib/flowField.ts`](lib/flowField.ts). A domain-warped fBm wash is painted offscreen at half rate. Every frame, a compose pass pushes it around using a coarse CPU fluid field (≈96×54 cells, ~0.5 ms per step) that the pointer stirs. The ink parts like a finger dragged through water, without looping over cursor points in the shader.
- **Work stage** — [`components/home/WorkStage.tsx`](components/home/WorkStage.tsx), [`components/motion/StageGL.tsx`](components/motion/StageGL.tsx) and [`lib/stageMath.ts`](lib/stageMath.ts). A scroll-driven strip of project cards rendered with OGL, which bend with scroll velocity. [`StageCursor`](components/motion/StageCursor.tsx) is a 128-point ring that springs onto the outline of the hovered card.
- **Content as data** — MDX case studies and YAML (résumé, gallery, open source), validated with zod at build time ([`lib/content/schema.ts`](lib/content/schema.ts)). The same content builds the system prompt for the optional on-site assistant ([`lib/agent/knowledge.ts`](lib/agent/knowledge.ts)).
- **Accessible motion** — every effect has a still frame under `prefers-reduced-motion` and a plain fallback when WebGL is unavailable.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run typecheck
npm run build
```

Dev-only switches:

- `?hero=silk` or `?hero=wash` previews either cover. The default is `HERO_BACKDROP` in [`lib/hero.ts`](lib/hero.ts).
- `?tune` opens a slider panel for the watercolour shader, which copies out the JSX props.

The chat endpoint (`/api/chat`) answers only when `ANTHROPIC_API_KEY` is set. Without it, the endpoint returns 503 and the rest of the site works normally.

The voice line ("Talk to me") is a [Retell](https://www.retellai.com/) web call. The browser SDK posts to `/api/voice`, which holds the key and pins the call to the agent, so nothing secret reaches the client. It needs:

- `RETELL_API_KEY`, `RETELL_AGENT_ID` at runtime (503 and a "type instead" fallback without them).
- `npm run retell:sync` to create or update the agent from the site's own content: the prompt in [`lib/agent/voicePrompt.ts`](lib/agent/voicePrompt.ts) is built from `content/resume.yaml`, the case studies and [`content/persona.yaml`](content/persona.yaml) (the personal material, in first person). The script reads `RETELL_LLM_ID` / `RETELL_AGENT_ID` to update instead of create and `RETELL_VOICE_ID` to pick the voice (a cloned one, for instance). `-- --dry` prints the prompt without touching Retell.

## Make it yours

The code is MIT; the content is not (see [LICENSE](LICENSE)). To reuse the site:

1. Edit `lib/site.ts` (name, URL, socials).
2. Replace `content/` with your own résumé, gallery and case studies, and swap out `public/images/` and the CV PDF.
3. Run `npm test`: the content tests check the schema and the required case-study sections.

A case study is `content/<locale>/work/<slug>.mdx` with the frontmatter from `lib/content/schema.ts` and eight `##` sections: Context, Constraints, My role, Architecture, Three decisions, Outcome, What I'd do differently, Stack. A `zh` page with no translation falls back to English with a note.

## Credits

The particle and ink-wash effects were inspired by [React Bits](https://reactbits.dev); the implementations here are original.

## License

Code: [MIT](LICENSE). Content (`content/`, `public/images/`, the CV): all rights reserved.
