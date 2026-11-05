import {mount} from 'cypress/react';
import {Harness,stubRpc} from '../support/harness';
import {selectConnection} from '../support/connection-method';
for(const width of [1440,390])describe(`Connection selection at ${width}px`,()=>{
 beforeEach(()=>{cy.viewport(width,900);stubRpc();});
 it('shows one method and preserves drafts while switching',()=>{
  mount(<Harness/>);cy.get('[aria-label="Settings"]').click();
  cy.get('[aria-label="Atlassian MCP connection"]').should('not.exist');
  cy.get('[aria-label="TWG profile"]').should('not.exist');
  selectConnection('twg');cy.get('[aria-label="TWG profile"]').clear().type('my-profile');
  cy.get('[aria-label="Secret file path"]').should('not.exist');
  selectConnection('mcp');cy.get('[aria-label="Atlassian MCP connection"]').should('exist');
  cy.get('[aria-label="TWG profile"]').should('not.exist');
  selectConnection('rest');cy.get('[aria-label="Secret file path"]').should('have.value','/example/jira.env');
  selectConnection('twg');cy.get('[aria-label="TWG profile"]').should('have.value','my-profile');
 });
 it('cancels unfinished authorization when changing method without disconnecting',()=>{
  cy.intercept('POST','/__rpc/mcp.start',{id:'flow',state:'authorizing',message:'Waiting for sign-in.'});
  cy.intercept('POST','/__rpc/mcp.cancel',{state:'cancelled',message:'Cancelled.'}).as('cancel');
  cy.intercept('POST','/__rpc/mcp.disconnect',()=>{throw Error('Switching methods must not delete credentials');});
  mount(<Harness/>);cy.get('[aria-label="Settings"]').click();selectConnection('mcp');
  cy.get('[aria-label="Complete MCP sign-in on the Paseo host"]').click();
  cy.get('[aria-label="Sign in to Atlassian"]').click();
  cy.get('[aria-label="Cancel sign-in"]').should('exist');
  selectConnection('rest');cy.wait('@cancel');
  cy.get('[aria-label="Secret file path"]').should('exist');
 });
});
