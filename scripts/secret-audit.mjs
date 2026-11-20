// Read-only pre-commit audit. Reports paths/categories, never matching values.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,lstatSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const temp=mkdtempSync(join(tmpdir(),'jira-secret-audit-'));
const findings=[];
try{
 const gitDir=existsSync(join(root,'.git'))?join(root,'.git'):join(temp,'.git');
 if(!existsSync(join(root,'.git')))execFileSync('git',['init','--quiet',temp]);
 const git=args=>execFileSync('git',[`--git-dir=${gitDir}`,`--work-tree=${root}`,...args],{encoding:'utf8'});
 const files=[...new Set(git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(Boolean))];
 let secrets=[];
 const env=join(root,'.local/jira.env');
 if(existsSync(env)){
  const text=readFileSync(env,'utf8');
  const token=text.match(/^JIRA_API_TOKEN\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g,'');
  const email=text.match(/^JIRA_EMAIL\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g,'');
  if(token&&token.length>12)secrets=[token,...(email?[Buffer.from(`${email}:${token}`).toString('base64')]:[])];
 }
 const patterns=[['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['Atlassian token',/ATATT3x[A-Za-z0-9_=-]{20,}/],['GitHub token',/gh[pousr]_[A-Za-z0-9]{30,}/],['AWS access key',/AKIA[0-9A-Z]{16}/],['literal credential',/(?:api[_-]?token|client[_-]?secret|password|authorization)\s*[:=]\s*['"][A-Za-z0-9_+\/=.-]{32,}['"]/i]];
 for(const file of files){
  const path=join(root,file);if(!existsSync(path))continue;
  if(lstatSync(path).isSymbolicLink()){findings.push([file,'symlink requires review']);continue;}
  const data=readFileSync(path);const text=data.toString('utf8');
  // Exact digests of visually reviewed public media; replacements require review again.
  const reviewedMedia={"assets/move-pending.png": "9fc4132b200bc8f17ab3ff88e34b1ce634411a37c6dda90c021b7ebb43e466c4", "assets/mapping-labels.png": "f29b88e3c4c274443153cb99f0833b5bfeb228ac8b60347dee44c96375b59bd3", "assets/project-chooser.png": "0b994c2cbd77086359c5c15f4d390b4e39cb0bbdb4c3691fcb90985defc4ca42", "assets/mappings.png": "3b13bc5a5251d473ba700d2f072d05b4ec76a419a60c8d9766492f42d3ee78a2", "assets/icon.png": "2c809a274cf8d89f5587f97f60b3e4f0315bd52ccadae777c9856d066e50e677", "assets/dashboard.png": "f2f0125352c3f2629f89014b600660e751c6e95db08655bc6d37b14ca63775cf", "assets/details.png": "2eb63a371850142c01ff91e67b31a7e71e4dcc83b1f7ccbf3df30b4951dd8974", "assets/settings.png": "0b8480baff3c55f212455beed95d4c7ba979229933becefe797a88a31d26f2db", "assets/mobile.png": "e501a0051cefd056e2d4574e1fb1a1678f6da1f17e31465905a29fcd82ffedd7", "assets/appearance.png": "0a8191770cf40bfb7447332e0309cd1248329cd317cbd2da9d38031814c05bc7", "assets/filters.png": "74fee7d4f79ba771c4a845ee0a4929e86c02f49c1c7125f0f88dff3c94467500", "assets/boards.png": "400cb5571df25c2cacda98460637def1cdf6c37b5499771218ace74cd4766617", "assets/empty-selection.png": "e102ecedb98711201b30fdf5b2b84311f6648c791d384c90194da17fd8a5e51e", "assets/transitions.png": "261a9a4f20536ccdc4925ebcc5802a9490359ab0083229dfe800994312ea496d", "assets/agent-states.png": "fd853284f4f3ca6a661944b4ffa643007b8882dcf99ba143644ef0b107fbff4e"};
  if(reviewedMedia[file]===createHash('sha256').update(data).digest('hex'))continue;
  if(/(?:^|\/)\.local\/|(?:^|\/)jira\.env$|\.(?:png|jpe?g|webp|zip|pdf|tgz)$/i.test(file))findings.push([file,'private artifact or binary requires review']);
  if(secrets.some(secret=>text.includes(secret)))findings.push([file,'matches local Jira credential']);
  for(const [label,pattern] of patterns)if(pattern.test(text))findings.push([file,label]);
 }
 console.log(`Scanned ${files.length} Git candidate files (tracked files included even if ignored).`);
 for(const [path,kind] of findings)console.log(`${path}: ${kind}`);
 console.log(findings.length?`${findings.length} finding(s) require review.`:'No credential-pattern or private-artifact findings.');
 console.log('Point-in-time heuristic scan; not a guarantee. Review staged changes before committing.');
 process.exitCode=findings.length?1:0;
}finally{rmSync(temp,{recursive:true,force:true});}
