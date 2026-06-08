# The REST API over curl

Source of truth: `docs/plan/05-api-design.md` and the OpenAPI spec at
`apps/backend/openapi/openapi.yaml`. Prefer the SDKs ([sdk-node.md](sdk-node.md),
[sdk-python.md](sdk-python.md)) in production; this page is the raw contract for
languages without an SDK or for debugging.

Base URL: `https://api.blockchain0x.com`. All resources live under `/v1/*`. The
API is additive within `/v1`; a breaking change becomes `/v2`.

## Authentication

Send the API key as a bearer token. The key prefix selects the network, so you
do not pass credentials any other way.

```bash
curl https://api.blockchain0x.com/v1/agents/agt_01HQX5 \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-Network: testnet"
```

`X-Network` is `mainnet` or `testnet` and must agree with the key prefix.
Missing or wrong values return `network.header_required` / `network.invalid` /
`apikey.network_mismatch`.

## Idempotency

Every state-changing request accepts an `Idempotency-Key` header. The server
stores `(key, request_hash, response)` for 24h; replaying the same key returns
the stored response, and reusing a key with a different body returns
`409 idempotency.conflict`. Always send one on `POST /v1/payments`.

```bash
curl -X POST https://api.blockchain0x.com/v1/payments \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-Network: testnet" \
  -H "Idempotency-Key: 1f3c9b2a-0e7d-4a51-9c3e-6b2a1f3c9b2a" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agt_01HQX5","to":"0xabc0000000000000000000000000000000000000","amountWei":"12500000"}'
```

## Pagination

Cursor-based, never offset (`docs/plan/05-api-design.md` "Pagination"). Request
`?cursor=<opaque>&limit=<int, default 25, max 100>&sort=<field>:<asc|desc>`.

```bash
curl "https://api.blockchain0x.com/v1/agents?limit=25&sort=createdAt:desc" \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-Network: testnet"
```

The response wraps the rows and a forward / backward cursor pair:

```json
{
  "data": [{ "id": "agt_01HQX5", "network": "testnet" }],
  "page": { "next": "b64cursor", "prev": null }
}
```

Follow `page.next` (when non-null) as the next request's `?cursor=`. Cursors are
opaque base64 tuples; do not parse them.

## Error envelope

Every non-2xx response is the canonical envelope (`docs/plan/05-api-design.md`
"Errors"); branch on `error.code`, never on `error.message`:

```json
{
  "error": {
    "code": "apikey.scope_insufficient",
    "message": "human-readable, safe to log",
    "requestId": "req_01HZ...",
    "details": null
  }
}
```

The full code list is in [errors.md](errors.md).

## Common resources

| Resource         | Path                   | Notes                                                                                                               |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Agents (wallets) | `/v1/agents`           | Read profile, balances, transactions.                                                                               |
| Payments         | `/v1/payments`         | Outbound USDC; mandatory `Idempotency-Key`.                                                                         |
| Payment requests | `/v1/payment-requests` | Create + settle invoices (`receive_money`).                                                                         |
| API keys         | `/v1/api-keys`         | Mint / rotate / revoke is dashboard-only under API-key auth (`apikey.unsupported_endpoint`); read usage is allowed. |
| Webhooks         | `/v1/webhooks`         | Read-only under API-key auth; CRUD is dashboard-only. See [webhooks.md](webhooks.md).                               |

Identity-changing, billing, team-management, and step-up-gated routes are
dashboard-only forever regardless of scope (`AGENTS.md` §1.1).
