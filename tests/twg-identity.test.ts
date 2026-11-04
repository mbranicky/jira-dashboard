import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeTwgIdentity} from '../server/twg-identity';
test('identity decoder accepts both advertised layouts and drops unrelated personal data',()=>{
 const identity={accountId:'synthetic-1',name:'Test User',email:'test@example.invalid'};
 for(const data of [identity,{user:identity,manager:{name:'Private'}}])assert.deepEqual(decodeTwgIdentity({data}),{accountId:'synthetic-1',displayName:'Test User'});
});
test('identity decoder does not treat generic success or incomplete identity as verified',()=>{
 for(const input of [{ok:true},{data:{}},{data:{accountId:'id'}},{data:{user:null}},{data:{name:'Test',accountId:''}}])assert.throws(()=>decodeTwgIdentity(input));
});
