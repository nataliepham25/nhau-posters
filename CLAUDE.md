@AGENTS.md

# NHAU Posters

A bilingual (English and Vietnamese) portfolio site showcasing NHAU's Vietnamese
cocktails. Each cocktail gets a generative SVG poster driven by its flavor data.
Content lives in Contentful.

## Stack

- Next.js App Router
- TypeScript (strict)
- Tailwind CSS
- Contentful (CMS)
- Deployed on Vercel

## Locales

- `en-US` (default)
- `vi`
- Vietnamese falls back to English for untranslated fields.

## Conventions

- Fetch Contentful data on the server only. Never expose tokens to the client or
  use `NEXT_PUBLIC_` for Contentful variables.
- Content model changes happen only through migration scripts in `/migrations`,
  never by hand in the Contentful UI.
- Keep the poster generator a pure function: cocktail data in, SVG out.
- Accessibility matters: semantic HTML, alt text, and respect for
  `prefers-reduced-motion`.
- Make small, focused changes and explain what you changed.
