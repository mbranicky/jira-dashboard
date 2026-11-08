import type {Issue} from './contracts';
// Follow visible board order (column order, then issue order), deduplicating
// statuses appearing in multiple columns. Missing selections never jump to #1.
export function issueNavigation(issues:Issue[],columns:{statusIds:string[]}[],key:string){
 const ordered=[...new Map(columns.flatMap(column=>issues.filter(issue=>column.statusIds.includes(issue.statusId))).map(issue=>[issue.key,issue])).values()];
 const index=ordered.findIndex(issue=>issue.key===key);
 return {index,total:ordered.length,previous:index>0?ordered[index-1]:undefined,next:index>=0?ordered[index+1]:undefined};
}
