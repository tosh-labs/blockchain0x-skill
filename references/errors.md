# The typed error-code contract

Source of truth: `docs/plan/05-api-design.md` (the envelope + general codes),
the `@blockchain0x/node` README (the `apikey.*` and `webhook.*` codes), and
`docs/concept-api-key-types.md` (the workspace `apikey.*` codes). Branch on the
stable `code` string, never on `message` text.

## Envelope

Every error response is the same shape (`docs/plan/05-api-design.md` "Errors"):

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

Codes are stable and namespaced. 4xx is a client fault, 5xx a server fault;
stack traces never leak. Include `requestId` in your own logs for support
escalation.

## API-key codes (`ApiKeyError`)

The SDK throws `ApiKeyError` for any `401` / `403` whose code starts with
`apikey.`. These are the codes an integration branches on most:

| Code                                  | HTTP | Meaning + fix                                                                                   |
| ------------------------------------- | ---- | ----------------------------------------------------------------------------------------------- |
| `apikey.invalid`                      | 401  | Malformed or unknown key. Re-mint.                                                              |
| `apikey.expired`                      | 401  | Key past its `expiresAt`. Mint a fresh one.                                                     |
| `apikey.revoked`                      | 401  | Key was revoked. Mint a fresh one.                                                              |
| `apikey.network_mismatch`             | 401  | `sk_test_` key used against mainnet (or vice versa). Use the right key.                         |
| `apikey.scope_insufficient`           | 403  | Wallet scope missing (for example `pay_bills`). Mint with the scope.                            |
| `apikey.workspace_scope_insufficient` | 403  | Workspace-scope route hit by an agent key, or missing workspace scope.                          |
| `apikey.wallet_not_assigned`          | 403  | Workspace key has no assignment for the target wallet.                                          |
| `apikey.role_insufficient_for_grants` | 403  | Minter tried to grant a scope above their role. Ask an Admin to mint.                           |
| `apikey.no_grants_remaining`          | 401  | Every assigned wallet was deleted and no workspace scopes remain; key auto-revoked. Mint fresh. |
| `apikey.agent_mismatch`               | 403  | Wallet-only key used against a different agent than it is bound to.                             |
| `apikey.agent_revoked`                | 401  | The bound agent was soft-deleted; the key cascaded to revoked.                                  |
| `apikey.unsupported_endpoint`         | 403  | API-key-driven API-key or webhook CRUD. Dashboard-only forever.                                 |

## Session vs API-key auth (`auth.invalid_session`)

| Code                   | HTTP | Meaning + fix                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.invalid_session` | 401  | The request was NOT accepted as an API-key call and fell back to session (cookie) auth, which you do not have. It does not mean your key is bad. Either the route is dashboard/session-only, or you called a workspace-level route with an agent-scoped (wallet-only) key. Use the agent-scoped endpoint, or a route that supports your key. See "Common pitfalls". |

## Common pitfalls

- **Agent-scoped (wallet-only) keys cannot call workspace-level routes.** Listing or aggregating across all agents (for example "list agents") is a workspace operation. A wallet-only key is fenced to one agent, so those routes return `401 auth.invalid_session`. Read your one agent with the get-by-id route (`agents.get(id)`), not the list route. To span many wallets, use a workspace key.
- **`auth.invalid_session` is not "bad key".** A genuinely invalid key returns `apikey.invalid`; an expired one `apikey.expired`. `auth.invalid_session` specifically means the route did not run API-key auth for this call. Confirm the endpoint supports API keys and that your bearer token starts with `sk_test_` / `sk_live_`.
- **Pass the full secret, not the 14-char prefix.** The key secret is shown once at creation; the keys list only shows the prefix. Pasting the prefix yields `apikey.invalid` (or `auth.invalid_session` if it loses the `sk_` shape).
- **Network is in the key prefix.** `sk_test_` is testnet, `sk_live_` is mainnet. A mismatch is `apikey.network_mismatch`, not a network outage.

## Webhook verification codes

`webhooks.verify` returns a discriminated result; on failure `result.code` is one
of the seven dotted codes (`@blockchain0x/node` README). See
[webhooks.md](webhooks.md) for the verifier.

| Code                               | Meaning                                         |
| ---------------------------------- | ----------------------------------------------- |
| `webhook.secret_missing`           | No signing secret was supplied to the verifier. |
| `webhook.signature_missing`        | No signature header on the delivery.            |
| `webhook.signature_malformed`      | Signature header present but unparseable.       |
| `webhook.timestamp_missing`        | No timestamp on a bare-hex signature.           |
| `webhook.timestamp_invalid`        | Timestamp not a number.                         |
| `webhook.timestamp_outside_window` | Drift exceeds the 5-minute replay window.       |
| `webhook.signature_mismatch`       | HMAC did not match (constant-time compare).     |

## General envelope codes (`Blockchain0xError`)

Non-`apikey` envelopes surface as `Blockchain0xError`. The ones an integration
sees most (`docs/plan/05-api-design.md`):

| Code                           | HTTP | When                                                                                                                                                                              |
| ------------------------------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `request.invalid`              | 400  | Body / params failed validation.                                                                                                                                                  |
| `idempotency.conflict`         | 409  | Same `Idempotency-Key` reused with a different request hash.                                                                                                                      |
| `agent.spend_cap_exceeded`     | 422  | Payment would breach the on-chain spend cap (or no active permission). Lower the amount, wait for the period reset, or have an owner raise/renew the limit.                       |
| `payment.requires_step_up`     | 422  | Amount exceeds the large-payment threshold and needs a human passkey step-up; an autonomous agent key cannot complete it (a member approves from the dashboard).                  |
| `payment.submit_failed`        | 502  | Payment reached the chain but the on-chain submission failed. Ensure the agent wallet is deployed + funded with USDC and its spend permission is registered on-chain, then retry. |
| `payment.recipient_sanctioned` | 422  | Recipient failed OFAC screening (generic; never reveals the screen).                                                                                                              |
| `internal.unavailable`         | 503  | A backend dependency for the action is not provisioned (e.g. fee recipient / chain endpoint). Operator/config issue; retry shortly or contact support with the `requestId`.       |
| `wallet.balance_unavailable`   | 503  | Upstream RPC error; retry later.                                                                                                                                                  |
| `rate_limit.exceeded`          | 429  | Per-resource rate limit; honour `Retry-After`.                                                                                                                                    |
| `network.header_required`      | 400  | `X-Network` missing on a workspace-scoped route.                                                                                                                                  |
| `network.invalid`              | 400  | `X-Network` not in `mainnet` / `testnet`.                                                                                                                                         |

## Branching pattern

```ts
import { Blockchain0xError, ApiKeyError } from '@blockchain0x/node';

try {
  await client.payments.create({
    agentId: 'agt_01HQX5',
    to: '0xabc0000000000000000000000000000000000000',
    amountWei: '12500000',
  });
} catch (err) {
  if (err instanceof ApiKeyError) {
    if (err.code === 'apikey.scope_insufficient') {
      // Mint a key with pay_bills.
    }
  } else if (err instanceof Blockchain0xError) {
    console.error(err.code, err.requestId, err.status);
  } else {
    throw err; // network / SDK bug / unknown
  }
}
```

Python mirrors this with `ApiKeyError` / `Blockchain0xError` and `e.code` (see
[sdk-python.md](sdk-python.md)).
