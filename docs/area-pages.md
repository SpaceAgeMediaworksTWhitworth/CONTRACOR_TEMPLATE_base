# Service area (town) pages

Rules come from the 2026-10 research report (AIOS `reports/Local contractor site SEO pitfalls.md`).
The short version:
- **No page for the home city.** The home page owns "<trade> in <home city>". A town file for the home
  city is skipped automatically and its URL 301s to `/`.
- **Max 20 towns**, all on the client's Google Business Profile service area list (`gbpListed: true`).
  Pick by real jobs and reviews first, then revenue, then search volume. Skip towns they've never worked.
- **2+ pieces of real local proof per town** (the audit fails without them on client sites):
  a job in that town (`jobs`), a review naming the town (`client.reviews.featured[].town`),
  a sourced local fact (`localFacts` with a `source`), or named neighborhoods/landmarks.
- **Every local fact has a source.** AI drafts only from real inputs. It never invents jobs or facts.
- **No service x town pages** ("roof repair in Kirkwood") unless the client has 2+ real jobs of that
  service in that town.
- Town pages show up in regular results, not the map pack (that runs on the GBP address).

One markdown file per town: `src/content/areas/<town-slug>-<st>.md`, e.g. `ofallon-mo.md`.
URL becomes `/service-areas/ofallon-mo/`.

## Why these have to be unique
Google ignores (or punishes) town pages that are the same page with the town name swapped.
Every town page needs facts that only fit that town. The layout adds the shared parts
(services list, reviews, CTA, map, schema). The file only holds what's special about the town.

## Format
```yaml
---
town: O'Fallon
state: MO
county: St. Charles County
order: 1                    # 1 = home town, then by job volume / priority
zips: ["63366", "63368"]
geo: { lat: 38.8106, lng: -90.6998 }
wikipedia: https://en.wikipedia.org/wiki/O%27Fallon,_Missouri   # used in schema areaServed sameAs
description: Meta description, 140-155 chars.
intro: One short paragraph for the top of the page.
neighborhoods: ["Winghaven", "..."]    # real subdivisions / areas. Only ones you're sure of.
landmarks: ["..."]                     # parks, roads, schools people know
homes: What the houses are like: age, styles, typical roofs, HOAs.
weather: The storm/weather angle that matters for this trade here.
permits: Who handles building permits (city vs county). General, no fees or rule details unless verified.
featuredServices: [roof-replacement, storm-damage-roof-repair, roof-inspections]
gbpListed: true                        # town is on the GBP service area list
jobs:                                  # real jobs here (best local proof)
  - { title: "Full roof replacement", text: "1-2 plain lines.", service: roof-replacement, image: /assets/images/jobs/kirkwood-1.jpg, date: 2026-08-14, source: "GHL opp / job ID" }
localFacts:                            # facts with a source URL or ID
  - { text: "Kirkwood requires a permit for full re-roofs.", source: "https://..." }
faqs:
  - { q: "...", a: "..." }             # 2-3 town-specific questions
verified: false                        # true once Tom or the client confirms the local facts
---
Body: 250-450 words in markdown, `##` headings. Written from the business's point of view,
about working in THIS town. No made-up jobs, reviews, or numbers.
```

## Rules
- Only state local facts you're confident are true. If unsure, leave it out.
- No fake projects, reviews, or stats. Real ones get added when the client gives them.
- 3rd-grade reading level. Short sentences. No em dashes.
