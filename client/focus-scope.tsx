import {createElement,type ReactNode} from 'react';
import {Platform} from 'react-native';

// Keep the host app's focus styling intact; only plugin-owned focus targets opt out.
export function FocusScope({children}:{children:ReactNode}){
 if(Platform.OS!=='web')return <>{children}</>;
 return createElement('div',{'data-jira-dashboard':'true',style:{display:'contents'},onFocusCapture:(event:any)=>event.target.setAttribute('data-jira-dashboard-focus','true')},
  createElement('style',null,'[data-jira-dashboard] :focus, [data-jira-dashboard] :focus-visible, [data-jira-dashboard-focus]:focus, [data-jira-dashboard-focus]:focus-visible { outline: none !important; }'),children);
}
