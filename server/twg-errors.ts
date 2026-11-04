export type TwgFailureKind='auth'|'forbidden'|'not-found'|'rate-limit'|'missing-cli'|'timeout'|'cancelled'|'unknown';
const messages:Record<TwgFailureKind,string>={
 auth:'TWG sign-in expired or was rejected. On the Paseo host, run twg login --force with the configured profile, then retry.',
 forbidden:'TWG denied access. Check the selected profile, site permissions and organizational access policy.',
 'not-found':'Jira issue not found or not accessible to the selected TWG profile.',
 'rate-limit':'Jira rate limit reached. Wait before retrying.',
 'missing-cli':'TWG CLI was not found. Check its absolute executable path in connection settings.',
 timeout:'TWG request timed out or exceeded its execution limits. Retry, or check the host connection.',
 cancelled:'TWG request cancelled.',
 unknown:'TWG request failed. Check CLI installation, authorization and command compatibility on the Paseo host.',
};
export class TwgFailure extends Error {constructor(readonly kind:TwgFailureKind){super(messages[kind]);}}
/** Only known codes and numeric statuses are inspected; raw diagnostic text is never retained. */
export function failureFromOutput(output:string):TwgFailure|undefined{
 if(Buffer.byteLength(output)>2*1024*1024)return;
 try{
  const body=JSON.parse(output);if(!body||typeof body!=='object')return;
  const e=body.error;if(!e||typeof e!=='object')return;
  const code=typeof e.code==='string'?e.code:'';
  const status=typeof e.statusCode==='number'?e.statusCode:e.downstreamError?.statusCode;
  if(['AUTH_INVALID','AUTH_EXPIRED','AUTH_REQUIRED','AUTH_MIGRATION_REQUIRED'].includes(code)||status===401)return new TwgFailure('auth');
  if(status===403)return new TwgFailure('forbidden');
  if(status===404)return new TwgFailure('not-found');
  if(status===429)return new TwgFailure('rate-limit');
  return new TwgFailure('unknown');
 }catch{return;}
}
