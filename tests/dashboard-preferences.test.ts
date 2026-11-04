import test from 'node:test';
import assert from 'node:assert/strict';
import {z} from 'zod';
import {dashboardPreferencesSchema} from '../shared/contracts';
import {clampPanelWidth,detailsPresentation} from '../shared/details-presentation';
test('existing installations retain modal details and both choices survive settings JSON validation',()=>{
 assert.equal(dashboardPreferencesSchema.parse({}).detailsView,'modal');
 for(const detailsView of ['modal','panel'])assert.deepEqual(z.json().parse(dashboardPreferencesSchema.parse({detailsView})),{detailsView,sprintByBoard:{}});
 assert.equal(dashboardPreferencesSchema.safeParse({detailsView:'unknown'}).success,false);
});
test('details panel fits the dashboard width and falls back to full screen on compact clients',()=>{
 assert.equal(detailsPresentation('panel',false,1000),'panel');
 assert.equal(detailsPresentation('panel',false,999),'fullscreen');
 assert.equal(detailsPresentation('panel',true,1200),'fullscreen');
 assert.equal(detailsPresentation('modal',true,390),'fullscreen');
 assert.equal(detailsPresentation('modal',false,1400),'modal');
});

test('panel resizing preserves readable details and board widths',()=>{
 assert.equal(clampPanelWidth(520,1400),520);
 assert.equal(clampPanelWidth(200,1400),360);
 assert.equal(clampPanelWidth(1200,1400),1000);
 assert.equal(clampPanelWidth(800,1000),600);
 // The remembered preference can be restored when the window grows again.
 assert.equal(clampPanelWidth(800,1400),800);
});
