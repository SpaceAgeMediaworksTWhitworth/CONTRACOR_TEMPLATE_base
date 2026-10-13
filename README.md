# Space Age Local Site Template

CodeStitch Intermediate Kit (Eleventy + LESS + Decap CMS) turned into a local SEO engine for
local service businesses. One data file per client, one "industry pack" per trade.
Full system notes live in the AIOS: `references/local-sites.md`, skills `/site-build` and `/site-seo`.

## New client in 6 steps
1. Clone this repo, `npm install`, delete the demo files in `src/content/areas/` and `src/content/services/`.
2. Fill in `src/_data/client.js` (business facts, tracking IDs, brand colors, GHL form ID).
3. `npm run scaffold` copies the trade's service pages from `industries/<trade>/` with the client's details.
4. Write the town pages in `src/content/areas/` (rules: `docs/area-pages.md`).
5. `npm run check` builds the site and runs the SEO audit and the contrast gate. Fix all errors.
6. Deploy on Netlify. At launch, set `client.domain` and `indexable: true`.

## Commands
| Command | What it does |
|---|---|
| `npm start` | Dev server + local CMS |
| `npm run build` | Production build to `public/` |
| `npm run scaffold` | Copy industry pack service pages into the site (`--force`, `--only a,b`) |
| `npm run audit` | SEO audit + contrast gate (both must pass) |
| `npm run audit:seo` | SEO audit of `public/` only (writes `seo-report.json`) |
| `npm run contrast` | Contrast gate: every built page, light + dark, 375px + 1280px, axe `color-contrast`. Any fail = exit 1. Needs Chrome (`CHROME_PATH` to override). `CONTRAST_PAGES="/,/about/"` checks just those. |
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
| AI crawler rules | `src/robots.html` | `/robots.txt` |
| AI site map | `src/llms.njk` (built from `client.js` + collections) | `/llms.txt` |
| Lead tracking | `src/assets/js/tracking.js` (dataLayer events for GTM) | |
| SEO history | `seo/reports/`, `seo/blog-log.json`, `seo/notes.md` | |

## Rules that keep sites ranking
- Town pages must be different from each other. The audit flags anything over 35% the same.
- Only real reviews, real numbers, real credentials. Schema hours must match the Google Business Profile.
- Keep `indexable: false` until launch day.
- GEO (AI answers): `robots.txt` names GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot,
  Google-Extended and Bingbot. `/llms.txt` lists the business, services, towns and the 10 newest posts.
  Both block or stub out while `indexable: false`. No bylines. Posts carry `BlogPosting` with the business as author, never a person.
  Put real BBB/Yelp/Angi links in `client.sameAs`. Open every post with a 40-60 word answer; the audit warns if not.
- No bylines. No author box, no owner name on posts. Posts credit the business. The audit fails a `Person` author or a byline.
- The site is always light. `color-scheme: light` is forced and there is no dark mode toggle. The contrast gate still checks dark so a phone in dark mode can never show unreadable text.
  Fix contrast fails in the LESS with the site's color variables (`--primary`, `--headerColor`, `--bodyTextColor`, etc.), not one-off hex values.
- Improvements that help every client go back into this template.

The original CodeStitch README is in `docs/codestitch-kit-readme.md`.
