import {defineRpc} from '@getpaseo/plugin';
import {z} from 'zod';
export const TRANSFER_LIMIT=25*1024*1024;
export const CHUNK_SIZE=192*1024;
export const attachmentSchema=z.object({id:z.string().regex(/^\d+$/),filename:z.string(),size:z.number().nonnegative(),mimeType:z.string(),author:z.string(),created:z.string()});
export type Attachment=z.infer<typeof attachmentSchema>;
const key=z.string().regex(/^[A-Z][A-Z0-9_]*-[1-9]\d*$/);
export const listAttachments=defineRpc({name:'attachments.list',input:z.object({key}),output:z.object({site:z.string(),files:z.array(attachmentSchema)})});
export const attachmentSettings=defineRpc({name:'attachments.settings',input:z.object({}),output:z.object({enabled:z.boolean(),uploadLimit:z.number().nonnegative(),limitSource:z.literal('plugin').optional()})});
export const readAttachment=defineRpc({name:'attachments.read',input:z.object({key,id:attachmentSchema.shape.id,offset:z.number().int().nonnegative()}),output:z.object({base64:z.string(),total:z.number(),mimeType:z.string()})});
export const beginUpload=defineRpc({name:'attachments.begin',input:z.object({key,filename:z.string().min(1).max(255),size:z.number().int().positive().max(TRANSFER_LIMIT),mimeType:z.string().max(120)}),output:z.object({uploadId:z.string().uuid()})});
export const uploadChunk=defineRpc({name:'attachments.chunk',input:z.object({uploadId:z.string().uuid(),offset:z.number().int().nonnegative(),base64:z.string().max(CHUNK_SIZE*4/3)}),output:z.object({received:z.number()})});
export const finishUpload=defineRpc({name:'attachments.finish',input:z.object({uploadId:z.string().uuid()}),output:z.array(attachmentSchema)});
export const cancelUpload=defineRpc({name:'attachments.cancel',input:z.object({uploadId:z.string().uuid()}),output:z.object({cancelled:z.boolean()})});
export function fileSize(bytes:number){return bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;}
export const prepareBrowserPreview=defineRpc({name:'attachments.preview.prepare',input:z.object({}),output:z.object({token:z.string().regex(/^[a-f0-9]{64}$/),baseUrl:z.string()})});
export const loadBrowserPreview=defineRpc({name:'attachments.preview.load',input:z.object({key,id:attachmentSchema.shape.id,token:z.string().regex(/^[a-f0-9]{64}$/)}),output:z.object({ready:z.boolean()})});
