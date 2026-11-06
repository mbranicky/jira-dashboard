# Registry icon

The plugin uses the supplied [ticket-and-play PNG](icon.png). Edit the [SVG source](icon.svg) when updating the artwork.

The secret audit exempts only this reviewed file's exact SHA-256 from its binary-review rule. Replacements must be reviewed before updating that digest.

## Listing screenshots

Dashboard, details, settings and mobile PNGs show real plugin components with fictional DEMO issues, names and example.atlassian.net. Captured in Chrome by cypress/registry/listing.cy.tsx using npm run test:ui. These are browser previews: Paseo host controls may differ.

Review new captures visually for clipping and private data before copying them from ignored test-results/ui into assets. Update the exact reviewed SHA-256 digests in scripts/secret-audit.mjs only after that review. Manifest media paths are verified in the distributable package.

Refreshed 2026-11-06 for the 1.0.0 release preparation. The desktop previews show the three-column sprint board and issue side panel in dark mode. The mobile preview shows issue details in light mode. Settings shows a fictional connected Atlassian MCP account, the write opt-in and the complete read-only connection report.
