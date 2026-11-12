import {mount} from 'cypress/react';
import {Harness,stubRpc} from '../support/harness';
for(const width of [1440,390,320])for(const title of ['Filters','Manage boards'])it(`${title} at ${width}px floats beside its trigger without moving the board`,()=>{
 cy.viewport(width,800);stubRpc();mount(<Harness light={width===390} transport={width===1440?'rest':width===390?'twg':'mcp'}/>);
 cy.get('[data-testid="column-surface-0"]').then($column=>{
  const top=$column[0].getBoundingClientRect().top;
  cy.get(`[aria-label="${title}"]`).then($trigger=>{
   const anchor=$trigger[0].getBoundingClientRect();
   cy.wrap($trigger).click();
   cy.get(`[data-testid="popover-${title}"]`).should('be.visible').should($panel=>{
    const r=$panel[0].getBoundingClientRect();
    expect(r.left).to.be.at.least(12);expect(r.right).to.be.at.most(width-12);
    expect(r.top).to.be.closeTo(anchor.bottom+4,1);expect(r.bottom).to.be.at.most(788);
    if(width===1440)expect(title==='Filters'?r.right:r.left).to.be.closeTo(title==='Filters'?anchor.right:anchor.left,1);
   });
  });
  cy.get('[data-testid="column-surface-0"]').should($column=>expect($column[0].getBoundingClientRect().top).to.equal(top));
  if(title==='Filters'){
   cy.get('[data-testid="filter-options"] [aria-label^="Filter by "]').should($items=>{
    expect($items).to.have.length(6);
    const rects=[...$items].map(el=>el.getBoundingClientRect());
    rects.forEach(r=>expect(r.top).to.be.closeTo(rects[0].top,1));
    if(width===1440)expect(rects[5].right).to.be.lessThan(width-12);
   });
   cy.get('[data-testid="filter-options"]').then($row=>{
    cy.get('[data-testid="filter-actions"]').should($actions=>expect($actions[0].getBoundingClientRect().top).to.be.at.least($row[0].getBoundingClientRect().bottom));
   });
   cy.get('[aria-label="Save as view"]').click();cy.get('[aria-label="Saved view name"]').type('Test view');
  }else cy.get('[aria-label="Board name"]').type('Test board');
  cy.get('[data-testid="column-surface-0"]').should($column=>expect($column[0].getBoundingClientRect().top).to.equal(top));
  cy.get('[data-cy-root]').screenshot(`popover-${title}-${width}`);
  cy.get(`[aria-label="Close ${title}"]`).click();
  cy.get(`[data-testid="popover-${title}"]`).should('not.exist');
  cy.get('[data-testid="column-surface-0"]').should($column=>expect($column[0].getBoundingClientRect().top).to.equal(top));
 });
});
it('Escape dismisses the active popover and returns to the toolbar',()=>{
 cy.viewport(1440,900);stubRpc();mount(<Harness/>);
 cy.get('[aria-label="Filters"]').click();cy.get('[aria-modal="true"][role="dialog"]').should('exist');cy.get('[aria-label="Save as view"]').focus();cy.realPress('Escape');
 cy.get('[data-testid="popover-Filters"]').should('not.exist');
 cy.get('[aria-label="Manage boards"]').click();cy.get('[aria-modal="true"][role="dialog"]').should('exist');cy.get('[aria-label="Board name"]').focus();cy.realPress('Escape');
 cy.get('[data-testid="popover-Manage boards"]').should('not.exist');
});
it('dismisses a nested filter before its parent and closes on outside click',()=>{
 cy.viewport(1440,900);stubRpc();mount(<Harness/>);
 cy.get('[aria-label="Filters"]').click();
 cy.get('[aria-label="Filter by Label"]').click();
 cy.get('[aria-modal="true"][role="dialog"] [aria-label="Close dropdown"]').should('exist').trigger('keyup',{key:'Escape',bubbles:true});
 cy.get('[aria-label="Close dropdown"]').should('not.exist');
 cy.get('[data-testid="popover-Filters"]').should('be.visible');
 cy.get('[aria-label="Dismiss Filters"]').click('topLeft');
 cy.get('[data-testid="popover-Filters"]').should('not.exist');
});
it('keeps the parent panel stationary while nested dropdowns open and close',()=>{
 cy.viewport(1440,900);stubRpc();mount(<Harness/>);
 cy.get('[aria-label="Filters"]').click();
 cy.get('[aria-modal="true"][role="dialog"]').should('exist');
 cy.get('[data-testid="popover-Filters"]').then($panel=>{
  const panel=$panel[0], initial=panel.getBoundingClientRect();
  for(const label of ['Label','Issue type','Version']){
   cy.get(`[aria-label="Filter by ${label}"]`).click();
   cy.get('[aria-label="Close dropdown"]').parents().each($ancestor=>{
    expect($ancestor.css('animation-name'),'nested modal must not fade').to.equal('none');
   });
   cy.window().then(win=>new Cypress.Promise<void>(resolve=>{
    const start=win.performance.now();
    function sample(){const r=panel.getBoundingClientRect();
     expect(r.top,'parent top').to.equal(initial.top);expect(r.height,'parent height').to.equal(initial.height);
     if(win.performance.now()-start<350)win.requestAnimationFrame(sample);else resolve();
    }sample();
   }));
   cy.get('[aria-label="Close dropdown"]').click('topLeft');
  }
 });
});
it('declares motion ownership to host overlay decorators across dialog role changes',()=>{
 cy.viewport(1440,900);stubRpc();
 const unowned:string[]=[];let observer:MutationObserver;
 cy.document().then(doc=>{
  // Native Polish discovers [role=dialog] and treats an opacity transition as
  // ownership of BOTH entrance and exit; otherwise role removal creates ghosts.
  observer=new doc.defaultView!.MutationObserver(records=>{
   for(const record of records){
    const root=record.target as HTMLElement;
    if(!root.matches?.('[data-jira-overlay-root]'))continue;
    const style=doc.defaultView!.getComputedStyle(root);
    if(style.transitionProperty!=='opacity'||parseFloat(style.transitionDuration)<=0)unowned.push(root.getAttribute('role')??'inactive');
   }
  });
  observer.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['role']});
 });
 mount(<Harness/>);
 cy.get('[aria-label="Filters"]').click();
 cy.get('[data-jira-overlay-root]').should('have.css','transition-property','opacity');
 cy.get('[aria-label="Filter by Label"]').click();
 cy.get('[aria-label="Search Label options"]').type('none-match');
 cy.contains('No matching options.').should('be.visible');
 cy.get('[aria-label="Close dropdown"]').click('topLeft');
 cy.get('[data-testid="popover-Filters"]').should('be.visible');
 cy.get('[aria-label="Close Filters"]').click();
 cy.then(()=>{observer.disconnect();expect(unowned).to.deep.equal([]);});
});
