import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {issueBranches,matchesIssue} from '../server/issue-branches';
test('discovers actual existing branches and checked-out worktrees without mutation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'jira-branches-'));
 const git=(...args:string[])=>execFileSync('git',['-C',dir,...args],{stdio:'pipe'});
 try{
  git('init');git('-c','user.name=Test','-c','user.email=test@example.com','commit','--allow-empty','-m','initial');
  git('checkout','-b','app-4225');
  git('branch','fix/APP-4225-followup');
  git('branch','app-42250');
  const choices=await issueBranches(dir,'APP-4225');
  assert.equal(choices.length,2);
  assert.ok(choices.find(c=>c.branch==='app-4225')?.path);
  assert.equal(choices.find(c=>c.branch.startsWith('fix/'))?.path,undefined);
  assert.equal(matchesIssue('app-42250','APP-4225'),false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('source base follows the checked-out branch and supports detached HEAD',async()=>{
 const {checkedOutBase}=await import('../server/issue-branches');
 const dir=await mkdtemp(join(tmpdir(),'jira-base-'));
 const git=(...args:string[])=>execFileSync('git',['-C',dir,...args],{stdio:'pipe'}).toString().trim();
 try{
  git('init');git('-c','user.name=Test','-c','user.email=test@example.com','commit','--allow-empty','-m','initial');
  git('checkout','-b','release/6.8');
  assert.equal(await checkedOutBase(dir),'refs/heads/release/6.8');
  const commit=git('rev-parse','HEAD');git('checkout','--detach');
  assert.equal(await checkedOutBase(dir),commit);
 }finally{await rm(dir,{recursive:true,force:true});}
});
