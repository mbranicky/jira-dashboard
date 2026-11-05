import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindMcpAccount} from '../server/mcp-binding';
const identity = {accountId: 'mock-user', displayName: 'Example user'};
const resources = [
  {id: 'other', url: 'https://other.atlassian.net', name: 'Other'},
  {id: 'chosen', url: 'https://example.atlassian.net', name: 'Example'},
];
test('MCP binds the exact configured site instead of the first accessible site', () => {
  const binding = bindMcpAccount('https://example.atlassian.net/', identity, resources);
  assert.equal(binding.cloudId, 'chosen');
  assert.equal(binding.siteUrl, 'https://example.atlassian.net');
  assert.deepEqual(bindMcpAccount(binding.siteUrl, identity, resources, binding), binding);
});
test('MCP rejects missing or ambiguous sites and account/site changes', () => {
  const binding = bindMcpAccount('https://example.atlassian.net', identity, resources);
  assert.throws(() => bindMcpAccount(binding.siteUrl, identity, []), /unavailable/);
  assert.throws(() => bindMcpAccount(binding.siteUrl, identity, [...resources, resources[1]]), /ambiguous/);
  assert.throws(() => bindMcpAccount(binding.siteUrl, {...identity, accountId: 'different'}, resources, binding), /changed/);
  assert.throws(() => bindMcpAccount(binding.siteUrl, identity, [{...resources[1], id: 'different'}], binding), /changed/);
  assert.throws(() => bindMcpAccount('https://other.atlassian.net', identity, resources, binding), /changed/);
});
test('MCP rejects malformed identity and unsafe site URLs without reflecting payloads', () => {
  for (const site of ['http://example.atlassian.net', 'https://example.atlassian.net.evil.test', 'https://user:secret@example.atlassian.net', 'https://example.atlassian.net/path']) {
    assert.throws(() => bindMcpAccount(site, identity, resources), /^Error: Select a valid Jira Cloud site\.$/);
  }
  assert.throws(() => bindMcpAccount('https://example.atlassian.net', {accountId: 'private'}, resources), /^Error: Could not verify the Atlassian account and sites\.$/);
});

test('observed MCP v2 resource envelope binds cloudId and url without requiring a site name',()=>{
 const liveShape={data:{resources:[{cloudId:'chosen',url:'https://example.atlassian.net'}]}};
 const binding=bindMcpAccount('https://example.atlassian.net',identity,liveShape);
 assert.equal(binding.cloudId,'chosen');assert.equal(binding.siteName,'example.atlassian.net');
 assert.deepEqual(bindMcpAccount(binding.siteUrl,identity,liveShape,binding),binding);
 assert.throws(()=>bindMcpAccount(binding.siteUrl,identity,{data:{resources:[{cloudId:'changed',url:binding.siteUrl}]}},binding),/changed/);
});
test('v2 resource envelopes fail closed for errors, ambiguous sites and invalid cloud IDs',()=>{
 const resource={cloudId:'chosen',url:'https://example.atlassian.net'};
 for(const resources of [
  {error:true,data:{resources:[resource]}},
  {data:{error:true,resources:[resource]}},
  {data:{resources:[{...resource,cloudId:''}]}},
  {data:{resources:[{...resource,id:'conflicting'}]}},
  {data:{resources:[resource,resource]}},
  {data:{resources:[{...resource,url:'https://other.atlassian.net'}]}},
  {data:{data:{resources:[resource]}}},
 ])assert.throws(()=>bindMcpAccount('https://example.atlassian.net',identity,resources));
});
