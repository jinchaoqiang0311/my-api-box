# model-redirect-mapping-guardrails Specification

## Purpose
Ensure that the Model Redirect auto-mapping algorithm never generates downgrade/upgrade mappings across model versions, while still allowing safe alias mappings within the same version (separator style, token ordering, and optional date suffixes).

## Requirements
### Requirement: Auto-generated mappings MUST be version-safe
When the system auto-generates a model redirect mapping (`standardModel -> actualModel`), it MUST NOT generate entries that downgrade or upgrade model versions. If no version-compatible actual model exists for a given standard model, the system MUST omit the mapping entry for that standard model.

#### Scenario: Reject cross-version mapping (Anthropic)
- **WHEN** the standard model is `claude-4.5-sonnet` and the channel only exposes `claude-3-5-sonnet-20241022`
- **THEN** the generated mapping MUST NOT include an entry for `claude-4.5-sonnet`

#### Scenario: Reject cross-version mapping (OpenAI)
- **WHEN** the standard model is `gpt-4o-mini` and the channel only exposes `gpt-4.1-mini`
- **THEN** the generated mapping MUST NOT include an entry for `gpt-4o-mini`

#### Scenario: Reject cross-version mapping (Google)
- **WHEN** the standard model is `gemini-2.5-pro` and the channel only exposes `gemini-3-pro`
- **THEN** the generated mapping MUST NOT include an entry for `gemini-2.5-pro`

### Requirement: Alias formats of the same version MAY be mapped
When the standard model and an actual model represent the same version but differ only by separator style, token ordering, or presence of a date suffix, the system MUST be able to map the standard model to the actual model.

#### Scenario: Map reordered alias format for the same version
- **WHEN** the standard model is `claude-4.5-sonnet` and the channel exposes `claude-sonnet-4-5-20250929`
- **THEN** the generated mapping MUST map `claude-4.5-sonnet` to `claude-sonnet-4-5-20250929`

#### Scenario: Map separator-only alias format for the same version
- **WHEN** the standard model is `gemini-2.5-pro` and the channel exposes `gemini-2-5-pro`
- **THEN** the generated mapping MUST map `gemini-2.5-pro` to `gemini-2-5-pro`

### Requirement: Versioned normalization MUST NOT cross versions
When the system normalizes model identifiers for redirect generation, it MUST treat model versions as part of identity. If multiple candidates share the same vendor/model-family keywords but have different versions, normalization MUST NOT resolve an input to a different version.

**Note [Numeric-token commutativity]:** The current normalization approach is order-insensitive (unordered token set). Numeric version tokens can therefore be commutative (e.g., `claude-5.4-sonnet` vs `claude-4.5-sonnet` may normalize to the same token key). No live models currently exhibit this collision; if such models appear, introduce a deterministic tie-breaker or switch to an ordered numeric-token strategy to preserve version identity.

#### Scenario: Normalizing a standard model does not downgrade its version
- **WHEN** the system normalizes `claude-4.5-haiku` for redirect generation and metadata contains both `claude-3-5-haiku-20241022` and `claude-haiku-4-5-20251001`
- **THEN** the normalized result MUST be version-compatible with `4.5` (and MUST NOT normalize to the `3.5` model)

### Requirement: Prune mappings whose target models are missing or invalid after model sync (site-aware)
When managed-site model sync refreshes a channel’s `models` list and the refreshed model list is different from the previously stored list, the system MUST be able to prune existing model redirect mappings (`model_mapping`) whose **target** models are not valid under the refreshed model list, when the prune option is enabled.

Validity is **site-aware**:
- Strict sites: `target.trim()` must exist in the refreshed model list.
- DoneHub: strip a single leading `+` before checking existence.
- New API: targets may be chained; a target is valid when it can resolve via `model_mapping` (A→B→C) to an available model. Cycles are invalid.

#### Scenario: Pruning is disabled by default
- **GIVEN** the user has not enabled the prune option
- **WHEN** model sync refreshes a channel’s model list and the model list changes
- **THEN** the system MUST NOT delete any existing `model_mapping` entries based on missing targets

#### Scenario: Pruning removes entries whose targets are missing from the refreshed model list
- **GIVEN** the prune option is enabled
- **AND** a channel has an existing `model_mapping` that includes an entry mapping standard model `S` to target model `T`
- **WHEN** model sync refreshes the channel model list to a new list that does not contain `T`
- **THEN** the system MUST delete the mapping entry `S -> T` before persisting the updated `model_mapping`

#### Scenario: Pruning preserves entries whose targets exist in the refreshed model list
- **GIVEN** the prune option is enabled
- **AND** a channel has an existing `model_mapping` that includes an entry mapping standard model `S` to target model `T`
- **WHEN** model sync refreshes the channel model list to a new list that contains `T`
- **THEN** the system MUST preserve the mapping entry `S -> T`

#### Scenario: New API preserves entries whose targets resolve via a mapping chain
- **GIVEN** the prune option is enabled
- **AND** the managed site type is New API (`new-api`)
- **AND** a channel has an existing `model_mapping` that includes `S -> T` and `T -> U`
- **WHEN** model sync refreshes the channel model list to a new list that contains `U` but does not contain `T`
- **THEN** the system MUST preserve the mapping entry `S -> T` (because `T` resolves to `U`)

#### Scenario: New API prunes entries when model_mapping contains a cycle
- **GIVEN** the prune option is enabled
- **AND** the managed site type is New API (`new-api`)
- **AND** a channel has an existing `model_mapping` that contains a mapping cycle
- **WHEN** model sync refreshes the channel model list
- **THEN** the system MUST treat cycle-resolving targets as invalid and prune affected entries

#### Scenario: DoneHub preserves entries whose targets use the billing-original '+' prefix
- **GIVEN** the prune option is enabled
- **AND** the managed site type is DoneHub (`done-hub`)
- **AND** a channel has an existing `model_mapping` that includes an entry mapping standard model `S` to target model `+T`
- **WHEN** model sync refreshes the channel model list to a new list that contains `T`
- **THEN** the system MUST preserve the mapping entry `S -> +T`

#### Scenario: Pruning is best-effort when existing model_mapping is invalid JSON
- **GIVEN** the prune option is enabled
- **AND** a channel has an existing `model_mapping` value that is not valid JSON
- **WHEN** model sync refreshes the channel model list
- **THEN** the system MUST NOT delete mappings based on the invalid `model_mapping`
- **AND** the system MUST continue applying any newly generated mappings as normal
