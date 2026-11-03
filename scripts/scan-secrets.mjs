// Run a pinned external scanner against history and Git candidates, never ignored local secrets.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,cpSync,mkdirSync,existsSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
const binary=process.env.GITLEAKS_BINARY||'gitleaks';
const version=execFileSync(binary,['version'],{encoding:'utf8'}).trim();
if(version!=='8.30.1')throw Error('Use Gitleaks 8.30.1 for reproducible scanning.');
execFileSync(binary,['git','.','--log-opts=--all','--redact=100','--no-banner'],{stdio:'inherit'});
const candidate=mkdtempSync(join(tmpdir(),'jira-source-scan-'));
try{
 const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
 for(const path of new Set(paths)){
  if(!existsSync(path))continue;
  if(lstatSync(path).isSymbolicLink())throw Error('Review symlink before scanning: '+path);
  const target=join(candidate,path);mkdirSync(dirname(target),{recursive:true});cpSync(path,target);
 }
 execFileSync(binary,['dir',candidate,'--redact=100','--no-banner'],{stdio:'inherit'});
}finally{rmSync(candidate,{recursive:true,force:true});}
