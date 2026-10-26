# Community Verification Submission API

This document defines the server contract consumed by My API Box's optional,
user-configured community submission service.

The extension sends no request unless all of these conditions are true:

- the user enabled community contributions;
- the user entered a non-empty HTTPS endpoint;
- the relevant automatic-submission switch is enabled.

The extension never sends an API key, access token, account balance, user ID,
credential profile, cookie, or probe request body. The payloads below are
allowlisted summaries produced locally by the extension.

## Base URL

The user enters a base URL, for example:

```text
https://ratings.example.com/api/v1
```

The client appends these relative paths:

```text
POST https://ratings.example.com/api/v1/probes
POST https://ratings.example.com/api/v1/prices
```

The server should enable CORS for the extension origins that it intends to
support. The client sends `Content-Type: application/json` and does not send an
Authorization header. Deploy the API behind HTTPS; the client rejects HTTP,
`file:`, `data:`, and malformed URLs.

## Response contract

Any `2xx` response is treated as accepted. A response body is not required.
For rejected requests, return an appropriate `4xx` response with a short JSON
error if useful:

```json
{
  "error": "invalid_payload",
  "message": "probes.reach.verdict is required"
}
```

The client logs the status locally and does not surface an optional submission
failure as a probe or model-catalog failure.

## `POST /probes`

One payload is sent after a completed local Site Probing run when the user has
enabled `autoSubmitAfterProbe`.

### Request

```json
{
  "station_hash": "8f2d7c5e4a1b0c3d",
  "site_type": "new-api",
  "extension_version": "1.0.0",
  "submitted_at": 1792924800000,
  "source": "site-probing",
  "probes": {
    "reach": {
      "verdict": "pass",
      "latency_ms": 420
    },
    "identity": {
      "verdict": "pass",
      "claimed_model": "gpt-4o",
      "actual_model": "gpt-4o"
    },
    "injection": {
      "verdict": "pass",
      "risk_score": 0,
      "detected": false
    },
    "cache": {
      "verdict": "pass",
      "replay_detected": false
    },
    "stream": {
      "verdict": "pass",
      "first_token_ms": 420,
      "chunk_count": 18
    },
    "billing": {
      "verdict": "pass",
      "overcharge_ratio": 1.02
    },
    "consistency": {
      "verdict": "pass",
      "drift_severity": 0
    }
  }
}
```

`station_hash` is present when the user enables URL hashing. In that mode,
`station_url` is omitted entirely: the server receives only the truncated
SHA-256 hex digest of the normalized station origin. When hashing is disabled,
`station_url` is present and `station_hash` is omitted. Treat the hash as the
stable station key for aggregation; do not attempt to reverse it.

### Allowed values

`source` must be `site-probing`.

Each `verdict` must be one of:

```text
pass | fail | suspect | unknown | skip
```

All numeric fields are optional and must be finite numbers. Reject NaN,
Infinity, negative latency, and unreasonably large values at ingestion. A
missing probe object is not an error: older extension versions may omit a
probe that was not selected.

## `POST /prices`

One payload is sent after a successful, non-cached model catalog refresh when
the user has enabled `autoSubmitAfterCatalog`.

### Request

```json
{
  "station_hash": "8f2d7c5e4a1b0c3d",
  "site_type": "new-api",
  "extension_version": "1.0.0",
  "submitted_at": 1792924800000,
  "source": "model-catalog",
  "models": [
    {
      "model_name": "gpt-4o",
      "quota_type": 0,
      "completion_ratio": 1,
      "token_price_usd_per_million": {
        "input": 5,
        "output": 15,
        "cache_read": 2.5,
        "cache_write": 5
      }
    },
    {
      "model_name": "embedding-3-small",
      "quota_type": 1,
      "completion_ratio": 1,
      "token_price_usd_per_million": {
        "input": 0.02
      }
    }
  ]
}
```

`source` must be `model-catalog`. `models` is a public-price snapshot, not a
credential or usage report. The server should treat a later snapshot as a new
observation rather than overwriting history. Use `(station key, model name,
submitted_at)` as a natural deduplication key if retries are added later.

`quota_type` is the provider's published billing mode. Preserve it as an
integer; do not infer a universal meaning beyond the source adapter's
published convention. `completion_ratio` and token prices are optional finite
numbers. The client preserves only the public pricing fields listed above.

## Recommended ingestion model

Store raw observations separately from the computed public ranking:

```text
station_observations
  id
  station_key       -- station_hash or normalized station_url
  station_url       -- nullable when only a hash was submitted
  site_type
  extension_version
  submitted_at
  source
  payload_json

station_health_aggregates
  station_key
  window_start
  window_end
  sample_count
  reach_pass_rate
  median_latency_ms
  probe_verdict_counts

model_price_observations
  station_key
  model_name
  submitted_at
  quota_type
  input_usd_per_million
  output_usd_per_million
  completion_ratio
```

Do not use an installer's random identifier as an account identity: the
current client intentionally does not send one. If abuse prevention is needed,
use rate limits, payload size limits, station-level aggregation, and explicit
retention rules rather than fingerprinting users.

## Privacy and abuse controls

- Reject payloads larger than a reasonable limit, for example 256 KiB for
  `/probes` and 1 MiB for `/prices`.
- Rate-limit by station key and coarse network controls; do not require API
  credentials from the extension.
- Strip unexpected JSON fields before persistence.
- Do not expose the original payload publicly if it contains a cleartext URL
  and the user did not enable hashing.
- Publish retention and deletion rules on the review website.
- Display sample counts and confidence intervals in rankings; do not turn one
  anonymous observation into a definitive station verdict.
- Keep `extension_version` for compatibility diagnostics, not user tracking.

## Example `curl`

```bash
curl -X POST 'https://ratings.example.com/api/v1/probes' \
  -H 'content-type: application/json' \
  --data @probe.json
```

The extension does not currently retry failed submissions. A server may return
`202 Accepted` after queueing the observation, or `204 No Content` after
synchronous validation.
