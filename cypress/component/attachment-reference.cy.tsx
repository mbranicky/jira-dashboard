import {mount} from 'cypress/react';
import {JiraContent} from '../../client/jira-content';
for(const width of [1440,390])it(`attachment reference opens Jira through the icon at ${width}px`,()=>{
 cy.viewport(width,800);const open=cy.stub().as('open');
 const theme:any={colors:{foreground:'#eee',foregroundMuted:'#aaa',surface2:'#333',border:'#555'}};
 mount(<JiraContent theme={theme} blocks={[{kind:'attachment',runs:[],prefix:'• '}]} onOpenJira={open}/>);
 cy.contains('Attachment').should('be.visible');cy.contains('[Attachment — open in Jira]').should('not.exist');
 cy.get('[aria-label="Open attachment in Jira"]').focus();cy.contains('Open in Jira').should('be.visible');
 cy.get('[aria-label="Open attachment in Jira"]').click();cy.get('@open').should('have.been.calledOnce');
});
