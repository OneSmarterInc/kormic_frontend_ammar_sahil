import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const committedPath = path.join(root, "contracts", "student-profile.openapi.json");
const livePath = process.argv[2];

if (!livePath) {
  throw new Error("Usage: node scripts/check-live-profile-schema.mjs <live-schema.json>");
}

const committed = JSON.parse(fs.readFileSync(committedPath, "utf8"));
const live = JSON.parse(fs.readFileSync(livePath, "utf8"));

function canonicalProfileContract(schema, label) {
  const component = schema?.components?.schemas?.ProfileCreateUpdate;
  if (!component || component.type !== "object" || !component.properties) {
    throw new Error(`ProfileCreateUpdate schema is missing from ${label}`);
  }

  const properties = Object.fromEntries(
    Object.entries(component.properties)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, definition]) => [name, definition]),
  );

  return {
    required: [...(component.required ?? [])].sort(),
    properties,
  };
}

const expected = canonicalProfileContract(committed, committedPath);
const actual = canonicalProfileContract(live, livePath);

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  const expectedFields = Object.keys(expected.properties);
  const actualFields = Object.keys(actual.properties);
  const missing = expectedFields.filter((field) => !actualFields.includes(field));
  const added = actualFields.filter((field) => !expectedFields.includes(field));

  throw new Error(
    [
      "Live backend student-profile schema differs from the committed contract snapshot.",
      `Added fields: ${added.join(", ") || "(none)"}`,
      `Missing fields: ${missing.join(", ") || "(none)"}`,
      "Refresh contracts/student-profile.openapi.json from /api/schema/ and regenerate types.",
    ].join("\n"),
  );
}

console.log("Live backend profile schema matches the committed student contract.");
