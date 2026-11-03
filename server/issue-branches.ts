import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export type BranchChoice={id:string;branch:string;path?:string};
export function matchesIssue(branch:string,key:string){
 const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return new RegExp('(^|[/_-])'+escaped+'($|[/_-])','i').test(branch);
}
export async function issueBranches(cwd:string,key:string):Promise<BranchChoice[]>{
 const git=async(args:string[])=>(await exec('git',['-C',cwd,...args],{timeout:15000,maxBuffer:4*1024*1024})).stdout;
 const branches=(await git(['for-each-ref','--format=%(refname:short)','refs/heads'])).split('\n').filter(b=>matchesIssue(b,key));
 const worktrees=(await git(['worktree','list','--porcelain','-z'])).split('\0\0').map(record=>{
  const fields=record.split('\0');return {path:fields.find(f=>f.startsWith('worktree '))?.slice(9),branch:fields.find(f=>f.startsWith('branch refs/heads/'))?.slice(18)};
 });
 return branches.flatMap(branch=>{
  const checked=worktrees.filter(w=>w.branch===branch&&w.path);
  return checked.length?checked.map(w=>({id:JSON.stringify([branch,w.path]),branch,path:w.path})): [{id:JSON.stringify([branch,null]),branch}];
 });
}
export function selectIssueBranch(choices:BranchChoice[],selection?:string){
 if(selection){const found=choices.find(c=>c.id===selection);if(!found)throw Error('The selected branch or worktree changed. Open Start work again.');return found;}
 if(choices.length>1)throw Error('Multiple issue branches or worktrees exist. Use Play to choose in the workspace dialog.');
 return choices[0];
}

export async function checkedOutBase(cwd:string){
 try{
  return (await exec('git',['-C',cwd,'symbolic-ref','--quiet','HEAD'],{timeout:15000})).stdout.trim();
 }catch{
  // Detached HEAD still provides an explicit, immutable starting commit.
  return (await exec('git',['-C',cwd,'rev-parse','--verify','HEAD'],{timeout:15000})).stdout.trim();
 }
}
