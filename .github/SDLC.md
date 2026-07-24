# OpenSec SDLC

OpenSec uses a small-batch GitHub flow built around the `dev` branch.

## Change flow

1. Open an issue before implementation. Product, UI, and architectural features require maintainer agreement.
2. Create a short branch from `dev`.
3. Open a pull request using the repository template and a conventional title.
4. Keep the change focused and include tests or reproducible verification. UI changes include screenshots or recordings.
5. Merge with squash after the required checks pass.

## Required checks

The protected `dev` branch requires:

- `unit (linux)`
- `unit (windows)`
- `e2e (linux)`
- `e2e (windows)`
- `typecheck`

The test workflow also checks generated client output and exercises the public HTTP API on Linux.

## Intake automation

External issues and pull requests are checked against the repository templates. Items labeled `needs:compliance` have 24 hours to be corrected before they are closed. Repository members and the OpenCode agent bot use the trusted fast lane.

The issue and pull request cleanup workflows are manual by default. This prevents low-volume repositories from losing valid work merely because it is old.

## AI automation

AI duplicate detection, `/review`, `/oc`, and `/opencode` are opt-in. To enable them:

1. Add the Actions secret `OPENCODE_API_KEY`.
2. Set the Actions variable `OPENSEC_AI_AUTOMATION` to `true`.

AI output is advisory. Compilation, type checking, tests, and branch rules remain authoritative.

## Upstream workflows

Release, deployment, generated-commit, container, localization, and package-publishing workflows inherited from `anomalyco/opencode` are guarded so they only run in the upstream repository. OpenSec can introduce its own release workflow once signing credentials, package destinations, and deployment environments are defined.
