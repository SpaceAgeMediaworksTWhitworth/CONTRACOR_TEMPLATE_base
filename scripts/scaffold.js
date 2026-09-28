// ─────────────────────────────────────────────────────────────────────────────
// SCAFFOLD: copy the industry pack's service pages into src/content/services/,
// filling {{business}}, {{city}}, etc. from src/_data/client.js.
//
//   npm run scaffold              copy services that don't exist yet
//   npm run scaffold -- --force   overwrite existing service files
//   npm run scaffold -- --only roof-repair,gutters
//
// After this, the files in src/content/services/ belong to the client. Edit them there.
// Town pages are client-specific and are written per client (see docs/area-pages.md).
// ─────────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const client = require("../src/_data/client");
const fillTokens = require("../src/config/utils/fillTokens");

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx > -1 ? args[onlyIdx + 1].split(",").map((s) => s.trim()) : null;

const packDir = path.join(__dirname, "..", "industries", client.industry);
const srcDir = path.join(packDir, "services");
const outDir = path.join(__dirname, "..", "src", "content", "services");

if (!fs.existsSync(srcDir)) {
	console.error(`No industry pack at ${packDir}. Check "industry" in client.js.`);
	process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const wanted = only || (client.services.length ? client.services : null);
let made = 0;
for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith(".md"))) {
	const slug = path.basename(file, ".md");
	if (wanted && !wanted.includes(slug)) continue;
	const out = path.join(outDir, file);
	if (fs.existsSync(out) && !force) {
		console.log(`skip   ${slug} (exists, use --force to overwrite)`);
		continue;
	}
	fs.writeFileSync(out, fillTokens(fs.readFileSync(path.join(srcDir, file), "utf8"), client));
	console.log(`wrote  ${slug}`);
	made++;
}
console.log(`\n${made} service page(s) written for ${client.name} (${client.industry}).`);
