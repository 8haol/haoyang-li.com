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

"Talk to me" runs on [Retell](https://www.retellai.com/): a voice agent for the web call and a chat agent for the typed panel. Retell versions each agent together with its own LLM, so there are two LLMs, both written from the same prompt and model. The browser talks only to `/api/voice` and `/api/chat`, which hold the key and pin every session to our agents, so nothing secret reaches the client. Each session passes `{{channel}}` (`voice` or `chat`) and `{{locale}}` so the one prompt can switch between spoken and written style. It needs:

- `RETELL_API_KEY`, `RETELL_AGENT_ID` and `RETELL_CHAT_AGENT_ID` at runtime. Without them the matching endpoint returns 503 and the rest of the site works normally.
- `npm run retell:sync` to create or update both agents and their LLMs from the site's own content: the prompt in [`lib/agent/prompt.ts`](lib/agent/prompt.ts) is built from `content/resume.yaml`, the case studies (featured ones in full, the rest as short cards, so the prompt stays short enough to follow) and [`content/persona.yaml`](content/persona.yaml) (the personal material, in first person, including sample exchanges that show the agent how Haoyang answers). The script reads `RETELL_AGENT_ID` + `RETELL_LLM_ID` and `RETELL_CHAT_AGENT_ID` + `RETELL_CHAT_LLM_ID` to update instead of create and `RETELL_VOICE_ID` to pick the voice (a cloned one, for instance). `-- --dry` prints the prompt without touching Retell. Change settings in code and re-run the sync rather than editing the Retell dashboard, which the next sync overwrites.

The contact form in the footer posts to `/api/contact`, which emails the message through [Resend](https://resend.com) with the visitor as Reply-To. It needs `RESEND_API_KEY` and `CONTACT_TO_EMAIL` (the inbox that receives the messages); without them the endpoint returns 503 and the form points visitors to the email address instead. `CONTACT_FROM_EMAIL` is optional: until a sending domain is verified in Resend, mail goes out from `onboarding@resend.dev`, which Resend only delivers to the account's own inbox.

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
