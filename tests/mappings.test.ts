import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mappingsSchema} from '../shared/contracts';
const mapping={jiraProjectKey:'DEMO',paseoProjectId:'project-1'};
test('blank or omitted skill is valid with automatic Jira updates enabled',()=>{
 const result=mappingsSchema.parse({items:[mapping]});
 assert.equal(result.items[0].entrySkill,'');
 assert.equal(result.items[0].autoUpdateJira,true);
 assert.equal(result.items[0].provider,'');
});
test('Jira update preference is independent from the optional skill',()=>{
 for(const entrySkill of ['', 'init-bugfix'])for(const autoUpdateJira of [true,false])assert.equal(mappingsSchema.parse({items:[{...mapping,entrySkill,autoUpdateJira}]}).items[0].autoUpdateJira,autoUpdateJira);
});
test('duplicate mappings and incomplete destinations are rejected',()=>{
 assert.equal(mappingsSchema.safeParse({items:[mapping,mapping]}).success,false);
 assert.equal(mappingsSchema.safeParse({items:[{...mapping,paseoProjectId:''}]}).success,false);
});

test('legacy startColumn is ignored without invalidating existing mappings',()=>{const result=mappingsSchema.parse({items:[{...mapping,startColumn:'Development'}]});assert.equal('startColumn' in result.items[0],false);});

test('form errors identify each mandatory field while old unnamed mappings remain readable',async()=>{
 const {mappingFormSchema}=await import('../shared/contracts');
 const legacy=mappingsSchema.parse({items:[mapping]});
 assert.equal(legacy.items[0].name,'');
 const result=mappingFormSchema.safeParse({items:[{jiraProjectKey:'',paseoProjectId:'',name:'  ',provider:''}]});
 assert.equal(result.success,false);
 if(!result.success)assert.deepEqual(new Set(result.error.issues.map(i=>i.path[2])),new Set(['name','jiraProjectKey','paseoProjectId','provider','isolation']));
 assert.equal(mappingFormSchema.safeParse({items:[{...mapping,name:'My mapping',provider:'codex',isolation:'directory'}]}).success,true);
});

test('changing a column clears the legacy status without breaking Paseo JSON settings validation',async()=>{
 const {z}=await import('zod');
 const {mappingFormSchema}=await import('../shared/contracts');
 const draft={...mapping,name:'Composer Application',provider:'claude',model:'opus',modeId:'auto',isolation:'worktree',startWorkColumn:'IN Progress/ Development',startWorkStatusId:undefined};
 // Paseo reparses the settings schema, then validates the result with z.json().
 const form=mappingFormSchema.parse({items:[draft]});
 const payload=mappingsSchema.parse(form);
 assert.doesNotThrow(()=>z.json().parse(payload));
 assert.equal(Object.hasOwn(payload.items[0],'startWorkStatusId'),false);
 assert.equal(payload.items[0].startWorkColumn,'IN Progress/ Development');
});
