import type {Connection} from './contracts';
export function assertRestConnection(config:Connection){
 if(config.transport==='twg')throw new Error('TWG preview supports dashboard reads only. Open the issue in Jira for details or changes.');
}
