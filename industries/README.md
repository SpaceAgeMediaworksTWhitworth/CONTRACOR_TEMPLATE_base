# Industry packs

One folder per trade (`roofing/`, `plumbing/`, ...). A pack holds the default content a new
client in that trade starts with. `npm run scaffold` copies it into `src/content/` and swaps the
tokens for the client's real details. After that, the files in `src/content/` belong to the
client and get edited (by hand, CMS, or Claude). The pack is never edited per client.

## Tokens
Pack files can use these. Scaffold replaces them from `src/_data/client.js`.
- `{{business}}` client name, `{{city}}` home city, `{{state}}` 2-letter state,
  `{{region}}` e.g. "St. Louis area", `{{phone}}` formatted phone, `{{years}}` years in business

## `pack.json`
```jsonc
{
  "industry": "roofing",
  "label": "Roofing",
  "titleNoun": "Roofing Contractor",          // used in titles: "<titleNoun> in <Town>, <ST>"
  "tradeTerms": ["roofing contractor", "roofer", "roofing company"], // head terms only the home page may pair with the home city
  "schemaType": "RoofingContractor",        // schema.org LocalBusiness subtype
  "gbpPrimaryCategory": "Roofing contractor",
  "home": { "topper": "", "headline": "", "text": "", "ctaLabel": "", "metaText": "one line for the home meta description", "image": "/assets/images/hero.jpg" },
  "trustPoints": [ { "title": "", "text": "" } ],   // "why pick us", 4 items
  "process": [ { "title": "", "text": "" } ],       // how a job works, 4 steps
  "faqs": [ { "q": "", "a": "" } ],                 // sitewide FAQs, 6-8
  "blogTopics": [ { "title": "", "keyword": "", "intent": "info|commercial|local", "season": "any|spring|summer|fall|winter", "links": ["service-slug"] } ],
  "reviewPrompts": [ "" ]                           // questions to ask happy customers
}
```

## `services/<slug>.md`
```yaml
---
name: Roof Replacement            # nav + card label
order: 1                          # sort order
featured: true                    # shows on home page
summary: One or two short sentences for cards.
description: Meta description, 140-155 chars, uses {{city}}.
schemaServiceType: Roof replacement
image: /assets/images/services/roof-replacement.jpg
signs: ["...", "..."]             # "Signs you need this", 4-6
process:                          # 3-5 steps
  - { title: "...", text: "..." }
faqs:                             # 4-6, real questions people search
  - { q: "...", a: "..." }
related: [roof-repair, roof-inspections]
---
Body in markdown. 500-800 words. Starts with a plain paragraph, then `##` sections.
```

## Service area pages (`src/content/areas/<town>-<st>.md`)
Client-specific, so they are not in the pack. See `docs/area-pages.md`.
