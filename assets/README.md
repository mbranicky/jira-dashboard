# Registry icon

The plugin uses the supplied [ticket-and-play PNG](icon.png). Edit the [SVG source](icon.svg) when updating the artwork.

The secret audit exempts only this reviewed file's exact SHA-256 from its binary-review rule. Replacements must be reviewed before updating that digest.

## Listing screenshots

Dashboard, details, settings and mobile PNGs show real plugin components with fictional DEMO issues, names and example.atlassian.net. Captured in Chrome by cypress/registry/listing.cy.tsx using npm run test:ui. These are browser previews: Paseo host controls may differ.

Review new captures visually for clipping and private data before copying them from ignored test-results/ui into assets. Update the exact reviewed SHA-256 digests in scripts/secret-audit.mjs only after that review. Manifest media paths are verified in the distributable package.

Refreshed 2026-11-08 from the current UI. Five screenshots were regenerated and visually reviewed: dashboard (icon-only Filters/Views, saved view, normal-weight card titles, priority pills and slim colored borders), issue details (compact navigation and labeled workspace action), mobile details, MCP connection diagnostics, and the new appearance settings with dropdowns, inline checkboxes and a live preview. All use fictional data. The settings harness substitutes a native HTML select for Paseo's host-supplied connection dropdown; these are component previews, not pixel-identical host captures.

The ticket-and-play icon PNG and its SVG source are intentionally unchanged. This media-only update does not change the package version or replace assets in the already-published npm release.
