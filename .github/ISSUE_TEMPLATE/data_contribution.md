---
name: Data contribution
about: Propose adding a new framework, controls, or mappings — or correcting existing data
title: "[Data] "
labels: data
assignees: ''
---

## What type of data change is this?

- [ ] New compliance framework + controls
- [ ] New mappings between existing controls
- [ ] Correction / update to existing framework metadata
- [ ] Correction / update to existing control(s)
- [ ] Correction / update to existing mapping(s)

## Framework(s) involved

<!-- List the framework IDs or names this change relates to (e.g. "ISO 27001:2022", "NIST CSF 2.0") -->

## Description of the change

<!-- Describe clearly what you want to add or fix and why. -->

## Source / reference

<!-- Provide the official publication, version, date, and URL for any new or updated data.
     Example: "ISO/IEC 27001:2022, published 2022-10-25, https://www.iso.org/standard/82875.html" -->

## Checklist (for PRs — fill in before opening one)

- [ ] Framework entry in `data/frameworks.json` uses a short, unique `id` (e.g. `nistcsf2`)
- [ ] Every control in `data/controls.json` references a valid `frameworkId`
- [ ] Every mapping in `data/mappings.json` references valid source and target control IDs
- [ ] `relationship` values are one of: `equivalent`, `subset`, `superset`, `related`
- [ ] Control IDs are short, stable, and unique (e.g. `iso27001-a.5.1`)
- [ ] Source is cited (version, publication date, official URL)

## Additional context

<!-- Any other information, screenshots, or links that would help reviewers. -->
