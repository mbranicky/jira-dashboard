// Resolve on the installation host, never inside Paseo's evaluated CommonJS bundle.
// This reads package locations only; it does not load native code or access credentials.
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
if(process.versions.electron)throw new Error('Prepare MCP storage using standalone Node, not Electron.');
const require=createRequire(import.meta.url);
const entry=require.resolve('@napi-rs/keyring');
writeFileSync(new URL('../server/mcp-native-location.json',import.meta.url),JSON.stringify({entry,node:process.execPath})+'\n',{mode:0o600});
