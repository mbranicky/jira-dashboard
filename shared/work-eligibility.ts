// Jira categories cover custom workflow names; explicit states also cover
// workflows whose post-development statuses are still categorized as To Do.
export function canStartWork(issue:{status:string;statusCategory?:string}):boolean {
  if(issue.statusCategory==='indeterminate'||issue.statusCategory==='done')return false;
  const status=issue.status.trim().toLowerCase().replace(/[_/–-]+/g,' ').replace(/\s+/g,' ');
  return !/^(done|closed|resolved|complete|completed|validated|developed|in progress|in development|in review|validation ready|ready for validation|in validation|under validation)$/.test(status);
}
