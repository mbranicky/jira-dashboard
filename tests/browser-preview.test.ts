import {get} from 'node:http';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {browserPreviews,imageType} from '../server/browser-preview';
test('only supported binary image signatures are previewed',()=>{assert.equal(imageType(Buffer.from('<svg onload="alert(1)">')),undefined);assert.equal(imageType(Buffer.from([137,80,78,71,13,10,26,10])),'image/png');assert.equal(imageType(Buffer.from('GIF89a')),'image/gif');});
test('loopback previews require unguessable paths, serve inline, and close with the plugin',async()=>{
 const service=browserPreviews();try{
 const target=await service.prepare();assert.match(target.baseUrl,/^http:\/\/127\.0\.0\.1:\d+$/);
 const response=await fetch(`${target.baseUrl}/${target.token}/probe`);assert.equal(await response.text(),target.token);
 assert.equal((await fetch(`${target.baseUrl}/${'0'.repeat(64)}/probe`)).status,404);
 assert.equal(await new Promise<number|undefined>((resolve,reject)=>{get(`${target.baseUrl}/${target.token}/probe`,{headers:{Host:'example.com'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);}),403);
 const bytes=Buffer.from([137,80,78,71,13,10,26,10]);
 const session={site:'https://example.atlassian.net',async request(path:string){return path.includes('/content/')?new Response(bytes,{status:206,headers:{'content-range':'bytes 0-7/8'}}):Response.json({fields:{attachment:[{id:'1',filename:'example.png',size:8,mimeType:'image/png',created:'2026-11-01'}]}});}};
 await service.load(session,'TEST-1','1',target.token);
 const image=await fetch(`${target.baseUrl}/${target.token}/image`);assert.equal(image.headers.get('content-type'),'image/png');assert.equal(image.headers.get('content-disposition'),'inline');assert.equal(image.headers.get('cache-control'),'no-store');assert.deepEqual(Buffer.from(await image.arrayBuffer()),bytes);
 service.close();await assert.rejects(fetch(`${target.baseUrl}/${target.token}/image`));
 }finally{service.close();}
});
