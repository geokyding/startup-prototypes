import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function run(defaultInput, analyze) {
  try {
    const file = process.argv[2] ?? fileURLToPath(defaultInput);
    const result = analyze(JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

