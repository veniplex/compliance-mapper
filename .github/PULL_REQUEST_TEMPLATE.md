## Summary

<!-- Briefly describe what this PR does and why. -->

## Related issue

Closes #<!-- issue number, if applicable -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing behaviour to change)
- [ ] Data update (adds or corrects framework / control / mapping data)
- [ ] Documentation update

## Checklist

- [ ] `npm test` passes locally
- [ ] I have added or updated tests for any changed server-side behaviour
- [ ] I have not committed a populated `.env` file
- [ ] The PR is focused on a single concern

### Data changes (complete if "Data update" is checked above)

- [ ] Framework `id` values are short, lowercase, and unique — and will not need to change after merging
- [ ] Every new control's `frameworkId` matches an entry in `data/frameworks.json`
- [ ] Every new mapping references valid `sourceControlId` and `targetControlId` values from `data/controls.json`
- [ ] `relationship` values are one of: `equivalent`, `subset`, `superset`, `related`
- [ ] New mapping `id` values follow the `map-NNN` sequential format
- [ ] Source is cited (official name, version, publication date, URL) in the PR description or framework `description` field
- [ ] JSON files are valid (no syntax errors)

## How to test

<!-- Steps a reviewer can follow to verify this change works as expected. -->
