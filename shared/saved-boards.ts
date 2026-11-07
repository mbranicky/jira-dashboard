import {z} from 'zod';
import type {Connection} from './contracts';
export function canonicalBoardUrl(value:string){
 let url:URL;try{url=new URL(value);}catch{throw Error('Enter a full Jira Cloud board URL.');}
 const match=url.pathname.match(/\/boards\/(\d+)\/?$/);const id=Number(match?.[1]);
 if(url.protocol!=='https:'||!/^[a-z0-9-]+\.atlassian\.net$/.test(url.hostname)||url.port||url.username||url.password||!match||!Number.isSafeInteger(id)||id<1)throw Error('Use an HTTPS Jira Cloud URL ending in /boards/<number>.');
 return `${url.origin}/boards/${id}`;
}
export const savedBoardSchema=z.object({name:z.string().trim().min(1).max(80),url:z.string().refine(v=>{try{canonicalBoardUrl(v);return true;}catch{return false;}},'Invalid Jira board URL')});
export function selectSavedBoard(config:Connection,url:string):Connection{
 const target=canonicalBoardUrl(url);const current=canonicalBoardUrl(config.boardUrl);
 if(new URL(target).origin!==new URL(current).origin)throw Error('Choose a board on the currently connected Jira site.');
 if(target!==current&&!config.savedBoards.some(b=>canonicalBoardUrl(b.url)===target))throw Error('Save this board before selecting it.');
 const savedBoards=config.savedBoards.some(b=>canonicalBoardUrl(b.url)===current)?config.savedBoards:[...config.savedBoards,{name:`Board ${current.split('/').pop()}`,url:current}];
 if(savedBoards.length>20)throw Error('Remove a saved board before switching so the current board can be retained.');
 return {...config,savedBoards,boardUrl:target};
}
export function addSavedBoard(config:Connection,name:string,url:string){
 const target=canonicalBoardUrl(url);if(new URL(target).origin!==new URL(canonicalBoardUrl(config.boardUrl)).origin)throw Error('Choose a board on the currently connected Jira site.');
 if(config.savedBoards.length>=20)throw Error('Maximum 20 saved boards. Remove a board first.');
 if(config.savedBoards.some(b=>canonicalBoardUrl(b.url)===target))throw Error('This board is already saved.');
 const board=savedBoardSchema.parse({name,url:target});return {...config,savedBoards:[...config.savedBoards,board]};
}
