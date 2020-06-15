/**
 * To start an example server, run the 'start' NPM script followed by the desired protocol and
 * example filename (with or without .ts extension).
 *
 * Examples:
 *    npm start http2 hello-world
 *    npm start http1 hello-world.ts
 *    npm start http2 static-files.ts
 */

import { extname, join } from 'path';
import { spawnSync } from 'child_process';

const [,, protocol, filename] = process.argv;

let dirname: string;

if (protocol === 'http2') {
  dirname = join(__dirname, 'http2');
}

else if (protocol === 'http1') {
  dirname = join(__dirname, 'http1');
}

else {
  const err = TypeError('Protocol argument must be one of either \'http1\' or \'http2\'.');
  console.error(err);
  process.exit(1);
}

process.chdir(dirname);

const ext = extname(filename);

let filepath;

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
