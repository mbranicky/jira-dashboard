import {Text,View} from 'react-native';
import type {z} from 'zod';
import type {Issue,issueDetailsSchema} from '../shared/contracts';
import type {SettingsTheme} from './settings-ui';

/** Identical field presentation in dashboard details and the workspace Jira tab. */
export function IssueFields({issue,details,theme}:{issue:Issue;details?:z.infer<typeof issueDetailsSchema>;theme:SettingsTheme}){
 const c=theme.colors;
 const field=(label:string,value:string|null|undefined)=><View key={label} style={{gap:4,minWidth:0}}><Text style={{color:c.foregroundMuted,fontSize:12}}>{label}</Text><Text selectable style={{color:c.foreground,fontSize:14,lineHeight:20}}>{value||'None'}</Text></View>;
 return <>
  {field('Parent',issue.parent?`${issue.parent.key} · ${issue.parent.summary}`:null)}{field('Fix versions',issue.fixVersions.join(', '))}{field('Labels',issue.labels.join(', '))}
  {details?<>{field('Assignee',details.assignee)}{field('Reporter',details.reporter)}{field('Due date',details.dueDate)}{field('Created',details.created?new Date(details.created).toLocaleString():null)}{field('Updated',details.updated?new Date(details.updated).toLocaleString():null)}</>:null}
 </>;
}
