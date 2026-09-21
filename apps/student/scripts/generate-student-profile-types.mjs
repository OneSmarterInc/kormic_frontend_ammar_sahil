import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const schemaPath = path.join(root, 'contracts', 'student-profile.openapi.json');
const outputPath = path.join(root, 'src', 'generated', 'studentProfileApi.ts');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const component = schema?.components?.schemas?.ProfileCreateUpdate;

if (!component || component.type !== 'object' || !component.properties) {
  throw new Error('ProfileCreateUpdate schema is missing from contracts/student-profile.openapi.json');
}

const required = new Set(component.required ?? []);

function tsType(definition) {
  let result;
  switch (definition.type) {
    case 'integer':
    case 'number':
      result = 'number';
      break;
    case 'boolean':
      result = 'boolean';
      break;
    case 'array':
      result = `${tsType(definition.items ?? { type: 'unknown' })}[]`;
      break;
    case 'object':
      result = 'Record<string, unknown>';
      break;
    case 'string':
      result = 'string';
      break;
    default:
      result = 'unknown';
  }
  return definition.nullable ? `${result} | null` : result;
}

const entries = Object.entries(component.properties);
const interfaceLines = entries.map(([name, definition]) => {
  const optional = required.has(name) ? '' : '?';
  return `  ${name}${optional}: ${tsType(definition)};`;
});
const fieldLines = entries.map(([name]) => `  '${name}',`);

const output = `// AUTO-GENERATED FILE. DO NOT EDIT.\n// Source: contracts/student-profile.openapi.json, derived from backend /api/schema/.\n\nexport interface StudentProfileUpsertRequest {\n${interfaceLines.join('\n')}\n}\n\nexport const STUDENT_PROFILE_UPSERT_FIELDS = [\n${fieldLines.join('\n')}\n] as const satisfies readonly (keyof StudentProfileUpsertRequest)[];\n\nexport type StudentProfileUpsertField = (typeof STUDENT_PROFILE_UPSERT_FIELDS)[number];\n`;

if (process.argv.includes('--check')) {
  const committed = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
  if (committed !== output) {
    throw new Error('Generated student profile API types are out of date. Run npm run api:generate-profile.');
  }
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
}
