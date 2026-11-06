import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'paseo-packed-build-'));
try {
  const packed = execFileSync('npm', [
    'pack', '--json', '--ignore-scripts', '--pack-destination', temporaryDirectory,
  ], { encoding: 'utf8' });
  const [{ filename }] = JSON.parse(packed);
  execFileSync('tar', ['-xzf', join(temporaryDirectory, filename), '-C', temporaryDirectory]);

  const cwd = join(temporaryDirectory, 'package');
  const manifest = JSON.parse(readFileSync(join(cwd, 'paseo-plugin.json'), 'utf8'));
  assert.ok(manifest.build?.length, 'Expected build commands in the packed manifest');
  for (const [command, ...args] of manifest.build) {
    console.log('Running packaged build:', command, ...args);
    execFileSync(command, args, { cwd, stdio: 'inherit' });
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
