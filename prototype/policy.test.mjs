import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertRead } from './policy.mjs';
test('rejects writes, generic dispatchers and unknown tools', () => {
  for (const name of ['transitionJiraIssue', 'editJiraIssue', 'executeWrite', 'executeRead', 'executeDestructive', 'unknown']) {
    assert.throws(() => assertRead(name));
  }
});
test('allows required board reads', () => {
  for (const name of ['getJiraBoardConfig', 'listJiraBoardSprints', 'getJiraBoardIssueData']) {
    assert.doesNotThrow(() => assertRead(name));
  }
});
