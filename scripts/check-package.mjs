import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const [pack]=JSON.parse(execFileSync('npm',['pack','--dry-run','--json','--ignore-scripts'],{encoding:'utf8'}));
const files=pack.files.map(file=>file.path);
const manifest=JSON.parse(readFileSync('paseo-plugin.json','utf8'));
// Paseo only loads imported modules within client/, server/ and shared/.
const clientInfo=JSON.parse(readFileSync('server/mcp-client-info.json','utf8'));
assert(files.includes('server/mcp-client-info.json'),'Missing MCP handshake metadata');
assert.deepEqual(clientInfo,{name:pack.name,version:pack.version},'MCP metadata must match the package');
assert.equal(pack.name,manifest.id,'Package name and default Paseo ID should agree');
assert(Array.isArray(manifest.media)&&manifest.media.length>0,'Visual plugin requires listing screenshots');
for(const asset of [manifest.icon,...(manifest.media??[])])assert(files.includes(asset),`Missing manifest asset: ${asset}`);
for(const required of ['assets/icon.png','LICENSE','README.md','CHANGELOG.md','OVERVIEW.md','paseo-plugin.json','index.client.tsx','index.server.ts','docs/JIRA_SETUP.md','docs/GETTING_STARTED.md','scripts/prepare-native.mjs'])assert(files.includes(required),`Missing package file: ${required}`);
assert(!files.includes('server/mcp-native-location.json'),'Installation-host paths must not be published');
for(const file of files)assert(!/(^|\/)(?:\.local|\.git|node_modules|tests|cypress|test-results|prototype)(?:\/|$)|\.env$|\.(?:log|tgz|pem|key)$/.test(file),`Unexpected package file: ${file}`);
console.log(`Package contents checked: ${files.length} files; required entries present, private/test artifacts excluded.`);
