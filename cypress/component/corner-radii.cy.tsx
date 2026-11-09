import {mount} from 'cypress/react';
import {Harness,stubRpc} from '../support/harness';

for(const transport of ['rest','twg','mcp'] as const)for(const light of [false,true])it(`${transport} ${light?'light':'dark'} corners stay nested on desktop and mobile`,()=>{
 cy.viewport(1440,900);stubRpc();mount(<Harness light={light} transport={transport}/>);
 cy.get('[data-testid="column-surface-0"]').should('have.css','border-radius','10px');
 cy.get('[data-testid="issue-card-TEST-1"]').should('have.css','border-radius','4px');
 cy.get('[aria-label="Configure mapping for TEST-1"]').should('have.css','border-radius','4px').children().first().should('have.css','border-radius','4px');
 cy.get('[aria-label="Actions for TEST-1"]').children().first().should('have.css','border-radius','2px');
 cy.get('[aria-label="Select sprint"]').should('have.css','border-radius','4px');
 if(transport==='rest')cy.get('[data-cy-root]').screenshot(`corners-board-${light?'light':'dark'}`);
 cy.get('[data-testid="keyboard-issue-title"]').first().click();
 cy.get('[aria-label="Close issue details"]').should('be.visible');
 if(transport==='rest')cy.get('[data-cy-root]').screenshot(`corners-details-${light?'light':'dark'}`);
 cy.get('[aria-label="Close issue details"]').click();
 cy.get('[aria-label="Settings"]').click();
 cy.get('[aria-label="Jira board URL"]').should('have.css','border-radius','4px');
 cy.get('[data-testid="issue-card-DEMO-42"]').should('have.css','border-radius','4px');
 if(transport==='rest')cy.get('[data-testid="dashboard-appearance"]').scrollIntoView().screenshot(`corners-settings-${light?'light':'dark'}`);
 cy.get('[aria-label="Back to board"]').scrollIntoView().click();
 cy.viewport(390,844);
 cy.get('[data-testid="column-surface-0"]').should('have.css','border-radius','10px');
 cy.get('[data-testid="issue-card-TEST-1"]').should('have.css','border-radius','4px');
 cy.get('[aria-label="Configure mapping for TEST-1"]').should('have.css','height','44px');
 if(transport==='rest')cy.get('[data-cy-root]').screenshot(`corners-mobile-${light?'light':'dark'}`);
});
