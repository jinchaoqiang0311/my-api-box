# changelog-on-update Specification

## Purpose
Help users see release notes after an extension update without creating an unexpected changelog tab. Instead, an inline update log is shown (at most once per version) the first time the user opens an extension UI surface after updating, when `openChangelogOnUpdate` is enabled. The inline update log UI provides a user-invoked action to open the full docs changelog page (version-anchored) in a new tab.

## Requirements
### Requirement: Automatic changelog opening on update is configurable
The extension MUST support a user preference `openChangelogOnUpdate` (default **enabled**) that controls whether the extension automatically shows the inline update log after an extension update.

#### Scenario: Default is enabled
- **GIVEN** a user has no stored `openChangelogOnUpdate` preference
- **WHEN** the extension loads user preferences
- **THEN** `openChangelogOnUpdate` MUST be treated as `true`

### Requirement: Changelog opens on first UI open after update
When the extension is updated, the background entrypoint MUST persist a pending changelog marker containing the updated version.

When a user opens an extension UI surface (popup/options/sidepanel), the UI MUST atomically consume and clear the pending marker. If `openChangelogOnUpdate` is enabled (default **enabled**), the UI MUST present the update log within the extension UI using the consumed version as the anchor/context, and MUST NOT automatically open the docs changelog page in a new active tab.

The inline update log UI MUST provide a user-invoked action to open the full docs changelog page anchored to the consumed version.

The pending marker MUST be consumed at most once so the update log is shown at most once per updated version, even if multiple UI contexts open concurrently.

This preference MUST only control automatic update-log opening. It MUST NOT suppress other update-time flows (e.g., prompting for newly introduced optional permissions).

#### Scenario: Update stores pending marker (no immediate tab)
- **GIVEN** the extension update lifecycle event fires (install reason `update`)
- **AND** the extension version is `2.39.0`
- **WHEN** the background update handler runs
- **THEN** the extension MUST persist a pending changelog marker for `2.39.0`
- **AND** the extension MUST NOT create any new tab for the docs changelog page at update time

#### Scenario: First UI open consumes and shows once
- **GIVEN** a pending changelog marker exists for version `2.39.0`
- **AND** `openChangelogOnUpdate = true`
- **WHEN** an extension UI surface mounts
- **THEN** the extension MUST present the update log within the extension UI anchored to `2.39.0`
- **AND** the extension MUST NOT automatically create any new tab for the docs changelog page
- **AND** the pending marker MUST be cleared
- **AND** subsequent UI opens MUST NOT show the update log again for `2.39.0`

#### Scenario: Preference disabled clears without showing
- **GIVEN** a pending changelog marker exists for version `2.39.0`
- **AND** `openChangelogOnUpdate = false`
- **WHEN** an extension UI surface mounts
- **THEN** the extension MUST NOT automatically show any update log UI
- **AND** the extension MUST NOT automatically open any changelog tab
- **AND** the pending marker MUST be cleared

### Requirement: Users can change the preference and it persists
The extension MUST provide a user-facing control to enable or disable `openChangelogOnUpdate`. The chosen value MUST be persisted and applied on subsequent extension updates.

#### Scenario: Setting persists across reload
- **GIVEN** a user disables `openChangelogOnUpdate`
- **WHEN** the extension reloads user preferences at a later time
- **THEN** `openChangelogOnUpdate` MUST remain `false` until the user changes it

## Verification

- Unit (background): `tests/entrypoints/background/changelogOnUpdate.test.ts`
- Unit (UI handler): `tests/components/ChangelogOnUpdateUiOpenHandler.test.tsx`
- E2E (Playwright): `e2e/changelogOnUpdate.spec.ts` (`pnpm -s e2e -- e2e/changelogOnUpdate.spec.ts`)

