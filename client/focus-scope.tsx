import {createElement,type ReactNode} from 'react';
import {Platform} from 'react-native';

// Keep the host app's focus styling intact; only plugin-owned focus targets opt out.
export function FocusScope({children}:{children:ReactNode}){
 if(Platform.OS!=='web')return <>{children}</>;
 return createElement('div',{'data-jira-dashboard':'true',style:{display:'contents'},onKeyDownCapture:(event:any)=>event.currentTarget.setAttribute('data-keyboard-focus','true'),onPointerDownCapture:(event:any)=>event.currentTarget.removeAttribute('data-keyboard-focus'),onFocusCapture:(event:any)=>event.target.setAttribute('data-jira-dashboard-focus','true')},
  createElement('style',null,'[data-jira-dashboard] :focus, [data-jira-dashboard] :focus-visible, [data-jira-dashboard-focus]:focus, [data-jira-dashboard-focus]:focus-visible { outline: none !important; } [data-jira-dashboard][data-keyboard-focus] [data-testid^="issue-card-"]:has([data-testid="keyboard-issue-title"]:focus[aria-expanded="false"]) { outline-style: solid !important; outline-width: 2px !important; }' ),children);
}
