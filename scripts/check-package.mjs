import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const [pack]=JSON.parse(execFileSync('npm',['pack','--dry-run','--json','--ignore-scripts'],{encoding:'utf8'}));
const files=pack.files.map(file=>file.path);
for(const required of ['LICENSE','README.md','paseo-plugin.json','index.client.tsx','index.server.ts','docs/JIRA_SETUP.md','docs/GETTING_STARTED.md'])assert(files.includes(required),`Missing package file: ${required}`);
for(const file of files)assert(!/(^|\/)(?:\.local|\.git|node_modules|tests|cypress|test-results|prototype)(?:\/|$)|\.env$|\.(?:log|tgz|pem|key)$/.test(file),`Unexpected package file: ${file}`);
console.log(`Package contents checked: ${files.length} files; required entries present, private/test artifacts excluded.`);
