export function selectConnection(value:'rest'|'twg'|'mcp'){
 const label={rest:'REST API',twg:'Teamwork Graph CLI',mcp:'Atlassian MCP'}[value];
 cy.get('body').then($body=>{
  if($body.find('select[aria-label="Connection method"]').length)cy.get('select[aria-label="Connection method"]').select(value);
  else {cy.get('[role="button"][aria-label^="Connection method:"]').scrollIntoView().click();cy.contains('[role="button"]',label).click();}
 });
}
