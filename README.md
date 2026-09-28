# Space Age Local Site Template

CodeStitch Intermediate Kit (Eleventy + LESS + Decap CMS) turned into a local SEO engine for
local service businesses. One data file per client, one "industry pack" per trade.
Full system notes live in the AIOS: `references/local-sites.md`, skills `/site-build` and `/site-seo`.

## New client in 6 steps
1. Clone this repo, `npm install`, delete the demo files in `src/content/areas/` and `src/content/services/`.
2. Fill in `src/_data/client.js` (business facts, tracking IDs, brand colors, GHL form ID).
3. `npm run scaffold` copies the trade's service pages from `industries/<trade>/` with the client's details.
4. Write the town pages in `src/content/areas/` (rules: `docs/area-pages.md`).
5. `npm run check` builds the site and runs the SEO audit. Fix all errors.
6. Deploy on Netlify. At launch, set `client.domain` and `indexable: true`.

## Commands
| Command | What it does |
|---|---|
| `npm start` | Dev server + local CMS |
| `npm run build` | Production build to `public/` |
| `npm run scaffold` | Copy industry pack service pages into the site (`--force`, `--only a,b`) |
| `npm run audit` | SEO audit of `public/` (writes `seo-report.json`) |
| `npm run check` | Build + audit |

## Where things live
| What | Where | URL |
|---|---|---|
| Business facts | `src/_data/client.js` | everywhere |
| Trade defaults | `industries/<trade>/pack.json` + `services/*.md` | (source only) |
| Service pages | `src/content/services/*.md` | `/services/<slug>/` |
| Town pages | `src/content/areas/*.md` | `/service-areas/<town>-<st>/` |
| Blog posts | `src/content/blog/*.md` | `/blog/<url>/` |
| Layouts | `src/_includes/layouts/` (`base`, `service`, `area`, `post`) | |
| Sections | `src/_includes/components/`, `sections/` | |
| Schema | `src/config/schema.js` (one linked `@graph` per page) | |
| Lead tracking | `src/assets/js/tracking.js` (dataLayer events for GTM) | |
| SEO history | `seo/reports/`, `seo/blog-log.json`, `seo/notes.md` | |

## Rules that keep sites ranking
- Town pages must be different from each other. The audit flags anything over 35% the same.
- Only real reviews, real numbers, real credentials. Schema hours must match the Google Business Profile.
- Keep `indexable: false` until launch day.
- Improvements that help every client go back into this template.

The original CodeStitch README is in `docs/codestitch-kit-readme.md`.
