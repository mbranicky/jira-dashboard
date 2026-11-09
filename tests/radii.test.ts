import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {insetRadius,radii,columnGeometry} from '../client/radii';
test('nested corners follow the inset until reaching a bounded optical floor',()=>{
 assert.equal(insetRadius(10,4),6);
 assert.equal(insetRadius(10,12),0);
 assert.equal(insetRadius(10,12,4),4);
 assert.equal(insetRadius(4,8,2),2);
 assert.equal(insetRadius(2,8,4),2);
 assert.equal(insetRadius(10,-2),10);
 assert.equal(columnGeometry.cardRadius,insetRadius(columnGeometry.radius,columnGeometry.inset,4));
 assert.ok(radii.card<columnGeometry.radius);
 assert.ok(radii.cardAction<radii.card);
});
test('plugin-owned corner values stay centralized',()=>{
 for(const file of readdirSync(new URL('../client/',import.meta.url)).filter(file=>/\.tsx?$/.test(file)&&file!=='radii.ts')){
  const source=readFileSync(new URL('../client/'+file,import.meta.url),'utf8');
  assert.doesNotMatch(source,/border(?:Radius|TopLeftRadius|TopRightRadius|BottomLeftRadius|BottomRightRadius)\s*:\s*[1-9]/,file);
 }
});
