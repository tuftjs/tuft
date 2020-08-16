/**
 * To start an example server, run the 'start' NPM script followed by the example filename (with or * without .ts extension).
 *
 * Examples:
 *    npm start hello-world
 *    npm start hello-world.ts
 *    npm start static-files.ts
 */

import { extname, join } from 'path';
import { spawnSync } from 'child_process';

const [,, filename] = process.argv;

process.chdir(__dirname);

const ext = extname(filename);

let filepath: string;

if (ext === '.ts') {
  filepath = join(process.cwd(), filename);
}

else if (!ext.startsWith('.')) {
  filepath = join(process.cwd(), `${filename}.ts`);
}

else {
  const err = TypeError('Filename must be a TS file with or without the \'.ts\' extension.');
  console.error(err);
  process.exit(2);
}

spawnSync('ts-node', [filepath], {
  stdio: ['inherit', 'inherit', 'inherit'],
});
