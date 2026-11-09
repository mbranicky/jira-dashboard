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
  const reviewedMedia={"assets/icon.png": "2c809a274cf8d89f5587f97f60b3e4f0315bd52ccadae777c9856d066e50e677", "assets/dashboard.png": "01eeb5a9681aecfca597f739613b0ed27289322512ac6a4367671aa954fb6117", "assets/details.png": "40d1dfd63e7e3fd54696090900520c05abb17731114e75c652dea5866388c7d9", "assets/settings.png": "d72111208142a804503199de64c145611502facfea60346c54788dd5847f47a0", "assets/mobile.png": "ac604d508225d514cdb75233a43c57ddb929c25d2bad3b9881b2d6737c59a0cd", "assets/appearance.png": "fdc304e04d199a30df2e5a275079ef6d163df70a566fc495adf7ae73d72f9043"};
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
