import {z} from 'zod';
// TWG 1.4.2 `help describe "user get" --detail full` advertises both layouts.
const user=z.object({accountId:z.string().min(1),name:z.string().min(1)});
export function decodeTwgIdentity(value:unknown):{accountId:string;displayName:string} {
 const envelope=z.object({data:z.unknown()}).safeParse(value);
 if(!envelope.success)throw new Error('Unsupported TWG identity response.');
 const data=envelope.data.data;
 const candidate=data&&typeof data==='object'&&'user' in data?(data as {user:unknown}).user:data;
 const parsed=user.safeParse(candidate);
 if(!parsed.success)throw new Error('Incomplete TWG identity response.');
 return {accountId:parsed.data.accountId,displayName:parsed.data.name};
}
