# Full travel project review and fixes

Goal: Reduce incorrect destinations, stale information and phone friction for the approved five-day vegan trip.
Architecture: Keep the existing static four-tab HTML/Leaflet app. Centralize date and location state transitions; preserve Google audit provenance and dietary uncertainty. Add source-linked daily meal fallback notes using existing venue IDs.
Authorization: Existing approved mobile design/direct implementation, followed by full review request and instruction to continue. No new hosting/publishing or contact with businesses.

- [x] Reproduce cross-tab stale date anchors, GPS late-response override, exchange GPS label/popup mismatches in tests/ui.test.cjs; fix app.js state transitions and popup marker type. Verify with node --test tests/ui.test.cjs.
- [x] Inspect offline lifecycle and navigation URLs; ensure scoped caches, truthful cache readiness, correct Google search versus directions and unique place identifiers when available. Add meaningful failure tests then fix core.js/sw.js/app.js.
- [x] Review original/Google restaurant evidence; retain dietary risk; remove contradictory assured hours, check priority backup locations against official pages; preserve exact raw evidence and human-readable change records.
- [x] Improve phone find-food flow within the approved layout: compact shared hero on secondary tabs, quick vegan filter and list/map jumps, practical compact cards with visible food warnings and expandable provenance; fit map to filtered results. Verify via native Chrome mobile viewport.
- [x] Add daily primary/fallback meal guidance keyed to nonclosed venues. Explicitly flag Ba Na preconfirmation/outside-food restriction, My Son sparse coverage, airline/hotel meals unconfirmed and weekly closures. Validate venue IDs and dietary boundaries.
- [x] Review final files and test suite, mobile preview, ZIP byte-for-byte content verification. Deliver source-linked review notes and rebuilt archive. No git repository exists; no commit or publish.
