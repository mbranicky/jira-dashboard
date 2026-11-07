# Registry icon

The plugin uses the supplied [ticket-and-play PNG](icon.png). Edit the [SVG source](icon.svg) when updating the artwork.

The secret audit exempts only this reviewed file's exact SHA-256 from its binary-review rule. Replacements must be reviewed before updating that digest.

## Listing screenshots

Dashboard, details, settings and mobile PNGs show real plugin components with fictional DEMO issues, names and example.atlassian.net. Captured in Chrome by cypress/registry/listing.cy.tsx using npm run test:ui. These are browser previews: Paseo host controls may differ.

Review new captures visually for clipping and private data before copying them from ignored test-results/ui into assets. Update the exact reviewed SHA-256 digests in scripts/secret-audit.mjs only after that review. Manifest media paths are verified in the distributable package.

Refreshed 2026-11-07 after 1.1.0. All four screenshot PNGs were regenerated and reviewed. The desktop board shows an active label filter and saved views; the detail panel shows related issues and section icons. Mobile uses a 430px viewport with related issues and comments visible. Settings shows a fictional MCP account and the complete connection report at 920px width. The harness substitutes a native HTML select for Paseo's host-supplied connection dropdown; it is a component preview, not a pixel-identical host capture.

The ticket-and-play icon PNG and its SVG source are intentionally unchanged. This media-only update does not change the package version or replace assets in the already-published npm release.
