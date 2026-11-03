import 'cypress-real-events/support';
import './component.css';
// Reject accidental live requests. Tests stub only the explicit fixture RPC boundary.
beforeEach(()=>{
 cy.intercept('https://**',()=>{throw new Error('Live network access is forbidden in UI tests');});
});
