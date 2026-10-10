#!/usr/bin/env node
const { spawnSyncWithAutoShell } = require('./util');
const fs = require('fs');
const path = require('path');

const SUBTARGETS = ['plugin', 'cli', 'utils', 'scripts'];
const args = process.argv.slice(2);
const target = args[0];

let tscArgs;
if (SUBTARGETS.includes(target)) {
  const targetDir = path.join(process.cwd(), target);
  if (!fs.existsSync(path.join(targetDir, 'tsconfig.json'))) {
    console.log(`tsconfig.json not found in ${target}, skipping build for ${target}`);
    process.exit(0);
  }
  tscArgs = ['--build', targetDir, ...args.slice(1)];
} else {
  tscArgs = [...args];
}

// One-shot by default. Pass --watch (or `npm run build -- --watch`) to rebuild on change.

const result = spawnSyncWithAutoShell('tsc', tscArgs, { stdio: 'inherit' });
if (result.error) {
  console.error(`tsc could not start: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
