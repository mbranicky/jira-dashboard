import {mount} from 'cypress/react';
import {Harness,stubRpc} from '../support/harness';
const button=(name:string)=>cy.get(`[role="button"][aria-label="${name}"]`);
describe('TWG experimental settings',()=>{
 beforeEach(()=>stubRpc());
 it('desktop login polls completion and separately checks access',()=>{
  cy.viewport(1440,1000);
  cy.intercept('POST','/__rpc/twg.start',req=>{expect(req.body.executable).eq('twg');req.reply({id:'job',state:'running',message:'Waiting for browser consent.'});}).as('start');
  cy.intercept('POST','/__rpc/twg.poll',{id:'job',state:'succeeded',message:'Login command completed. Test TWG access next.'}).as('poll');
  mount(<Harness/>);button('Settings').click();button('Sign in with TWG').click();cy.wait('@start');
  button('Cancel TWG operation').should('exist');cy.wait('@poll');cy.contains('Login command completed.').should('be.visible');
  button('Test TWG access').click();cy.wait('@start').its('request.body.action').should('eq','check');
 });
 it('phone wraps actions, shows host guidance and cancels pending authorization',()=>{
  cy.viewport(390,844);
  cy.intercept('POST','/__rpc/twg.start',{id:'job',state:'running',message:'Waiting for browser consent.'});
  cy.intercept('POST','/__rpc/twg.poll',{id:'job',state:'running',message:'Waiting for browser consent.'});
  cy.intercept('POST','/__rpc/twg.cancel',{id:'job',state:'cancelled',message:'TWG operation cancelled.'}).as('cancel');
  mount(<Harness/>);button('Settings').click();cy.contains('Use your desktop for sign-in:').scrollIntoView().should('be.visible');
  button('Sign in with TWG').click();button('Cancel TWG operation').click();cy.wait('@cancel');cy.contains('TWG operation cancelled.').should('be.visible');
  cy.get('[aria-label="TWG executable on host"]').should('not.be.disabled');
 });
 it('failed check gives a retryable error without disturbing REST fields',()=>{
  cy.intercept('POST','/__rpc/twg.start',{id:'job',state:'running',message:'Checking…'});
  cy.intercept('POST','/__rpc/twg.poll',{id:'job',state:'failed',message:'Check installation and authorization on the host.'});
  mount(<Harness/>);button('Settings').click();button('Test TWG access').click();
  cy.contains('Check installation and authorization on the host.').should('be.visible');
  cy.get('[aria-label="Jira board URL"]').should('have.value','https://example.atlassian.net/boards/1');
 });
});
