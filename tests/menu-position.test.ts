import test from 'node:test';
import assert from 'node:assert/strict';
import {menuPosition} from '../shared/menu-position';
test('overlay aligns below the trigger without changing page layout',()=>{
 assert.deepEqual(menuPosition({x:24,y:70,width:320,height:44},{width:1200,height:800},260),{left:24,top:118,width:320,maxHeight:260});
});
test('overlay flips above near the bottom and stays within mobile viewport',()=>{
 const position=menuPosition({x:220,y:550,width:260,height:48},{width:360,height:640},260);
 assert.deepEqual(position,{left:88,top:286,width:260,maxHeight:260});
 const compact=menuPosition({x:0,y:50,width:500,height:44},{width:320,height:300},260);
 assert.equal(compact.width,296);assert.equal(compact.left,12);
 assert.ok(compact.top+compact.maxHeight<=288);
});
test('preferred space below is bounded even when more room exists above',()=>{
 const position=menuPosition({x:24,y:400,width:260,height:44},{width:1200,height:690},260);
 assert.equal(position.top,448);assert.equal(position.maxHeight,230);
});
