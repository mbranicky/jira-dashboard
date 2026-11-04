import {mount} from 'cypress/react';
import {Harness,stubRpc,board} from '../support/harness';
const button=(name:string)=>cy.get(`[role="button"][aria-label="${name}"]`);
describe('Remembered sprint selection',()=>{
 beforeEach(()=>{
  stubRpc();
  cy.intercept('POST','/__rpc/board.read',req=>req.reply({...board,selectedSprintId:req.body.sprintId??null,issues:[],sprints:[{id:1,name:'Team one',state:'active'},{id:2,name:'Team two',state:'active'}]})).as('board');
 });
 it('restores a chosen sprint after leaving, saving connection and changing appearance',()=>{
  mount(<Harness/>);cy.wait('@board');button('Select sprint').click();cy.contains('Team two · active').click();
  cy.wait('@board').its('request.body.sprintId').should('eq',2);
  cy.get('[data-testid="navigate"]').click();cy.get('[data-testid="navigate"]').click();
  button('Select sprint').should('contain.text','Team two').and('not.contain.text','Auto');
  button('Settings').click();cy.contains('[role="radio"]','Right side panel').click();button('Save connection').click();cy.contains('Settings saved.').should('be.visible');button('Back to board').scrollIntoView().click();
  button('Select sprint').should('contain.text','Team two');
  button('Select sprint').click();cy.contains('Follow active sprint').click();cy.wait('@board');
  cy.get('[data-testid="navigate"]').click();cy.get('[data-testid="navigate"]').click();
  button('Select sprint').should('contain.text','Auto');
 });
 it('shows save failure rather than pretending the sprint was remembered',()=>{
  mount(<Harness failSave/>);cy.wait('@board');button('Select sprint').click();cy.contains('Team two · active').click();
  cy.contains('Could not save sprint selection. Please retry.').should('be.visible');
  button('Select sprint').should('contain.text','Auto');
 });
});
