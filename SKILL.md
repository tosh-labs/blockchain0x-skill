---
name: blockchain0x-wallet
description: >-
  Integrate Blockchain0x non-custodial agent wallets into an AI agent: choose
  and scope an API key, read balances and transactions, request and settle USDC
  payments on Base, pay x402 endpoints, and verify HMAC-signed webhooks. Use
  this when building or editing an agent that holds or moves USDC, accepts or
  consumes x402 payments, calls the Blockchain0x REST API or the
  @blockchain0x/node or blockchain0x (Python) SDKs, connects to the Blockchain0x
  MCP server, or verifies Blockchain0x webhooks. Knowledge only - it ships no
  executable and no secret; capability comes from a key you mint and scope.
license: MIT
metadata:
  version: 0.1.0-alpha.1
  homepage: https://blockchain0x.com/integrations/skill
  source: https://github.com/tosh-labs/blockchain0x-skill
---

# Blockchain0x agent-wallet integration

Blockchain0x is a non-custodial AI-agent wallet platform: a human owns the
wallet, an autonomous agent operates it within owner-set boundaries (API-key
expiry, spend allowance, per-period cap), using USDC on Base mainnet and Base
Sepolia testnet (`AGENTS.md` §1.1). This skill teaches an agent to integrate
that surface correctly the first time: pick the right key shape and scopes, read
wallet state, move money idempotently, pay and serve x402 endpoints, and verify
inbound webhooks. It documents the shipped SDKs and APIs and re-implements none
of them. Apply it whenever the task touches a Blockchain0x wallet, a USDC
payment, an x402 endpoint, or a Blockchain0x webhook.

It is knowledge, not custody. Reading the whole skill grants no capability: it
holds no key and runs no code. Capability comes only from an API key the
consumer mints and scopes, enforced server-side (`AGENTS.md` non-negotiables
1-2).

## 1. Choose the key shape and scopes

There are two API-key shapes (full decision tree in
[references/scopes-and-keys.md](references/scopes-and-keys.md), sourced from
`docs/concept-api-key-types.md`):

- **Wallet-only** - bound to ONE agent via `agentId`. The right shape when the
  consumer IS one wallet (an autonomous trading bot, a chat agent that pays its
  own bills). Mint with `{ label, scopes, agentId }`.
- **Workspace** - for a human operator spanning many wallets. Carries
  `workspaceScopes` and/or `walletAssignments` and an optional `expiresInDays`.
  Omit `agentId`.

Pick wallet-only unless the consumer needs more than one wallet or the workspace
surface (members, audit, usage, public copy). Default to the most restrictive
shape that does the job; rotating later is cheap.

Four wallet scopes, identical in both shapes (`AGENTS.md` §1.1,
`@blockchain0x/node` README):

| Scope                    | Grants                                                                      |
| ------------------------ | --------------------------------------------------------------------------- |
| `read_wallet_metadata`   | Read balances, transactions, earnings, audit, spend permissions, usage.     |
| `manage_wallet_metadata` | Superset of read; update public profile copy (tagline, social, about, SEO). |
| `pay_bills`              | Create payments, capped by the agent's spend permission allowance.          |
| `receive_money`          | Create payment requests / invoices and settle them on-chain.                |

Two workspace scopes (workspace shape only): `read_workspace` and
`manage_workspace_metadata`. Workspace-key minting is RBAC-bounded: the minter
cannot grant a scope they do not hold (over-grant rejects with
`apikey.role_insufficient_for_grants`).

## 2. Network model (test vs live)

The key prefix is the network (`@blockchain0x/node` README, `AGENTS.md` §1.1):

- `sk_test_...` keys talk to Base Sepolia (testnet).
- `sk_live_...` keys talk to Base mainnet.

The SDK reads the network from the key and stamps `X-Network` on every request.
A mismatched caller is rejected with `apikey.network_mismatch`. There are no
cross-network payments: a testnet agent paying a mainnet service is rejected
(`AGENTS.md` §1.1). The network and workspace are fixed by the key, and a
wallet-only key is already bound to its agent, so the server fences every call -
you never authenticate per-call or pass a `workspaceId`.

## 3. The four canonical tasks

Smallest correct snippet per task. Node shown here; Python idioms are in
[references/sdk-python.md](references/sdk-python.md). Set `BLOCKCHAIN0X_API_KEY`
to a `sk_test_*` or `sk_live_*` key.

### Read balance and transactions (`read_wallet_metadata`)

```ts
import { createClient } from '@blockchain0x/node';

const client = createClient({ apiKey: process.env.BLOCKCHAIN0X_API_KEY! });

const agent = await client.agents.get('agt_01HQX5...');
const usage = await client.apiKeys.usage({ windowDays: 1 });
```

Deep dive: [references/sdk-node.md](references/sdk-node.md),
[references/rest-api.md](references/rest-api.md).

### Request and settle a payment (`receive_money`)

```ts
// Create the invoice via POST /v1/payment-requests (receive_money) - see
// references/rest-api.md. Once the payer has paid, settle it on-chain:
const settled = await client.paymentRequests.settle({
  paymentRequestId: 'pr_01HQ...',
  body: {
    txHash: '0x...',
    payerAddress: '0x...',
    amountUsdcVerified: '10.00',
  },
});
```

The `@blockchain0x/node` SDK ships `paymentRequests.settle`; creating the request
is a REST call ([references/rest-api.md](references/rest-api.md)). Full settle
shape: [references/sdk-node.md](references/sdk-node.md).

### Pay an x402 endpoint (`pay_bills`)

```ts
import { createX402Client } from '@blockchain0x/x402/client';

const fetchWithPay = createX402Client({ sdk: client });
// Attaches the X-Payment header automatically when a 402 challenge arrives.
const res = await fetchWithPay('https://api.vendor.com/llm-query', {
  method: 'POST',
});
```

To create a payment directly (not via x402), use `client.payments.create({
agentId, to, amountWei })` (`amountWei` is the on-chain integer amount as a
string); it auto-attaches an `Idempotency-Key` and has retries OFF by default to
avoid double-spends. Exact shape + units: [references/sdk-node.md](references/sdk-node.md).
x402 wire format and the receive side: [references/x402.md](references/x402.md).

### Verify an inbound webhook (HMAC)

```ts
import { webhooks } from '@blockchain0x/node';

const result = webhooks.verify({
  headers: req.headers,
  rawBody: req.body, // raw bytes, NOT parsed JSON
  secret: process.env.BLOCKCHAIN0X_WEBHOOK_SECRET!,
});
if (!result.ok) {
  // result.code is one of the dotted webhook.* failure codes
  return res.status(400).json({ code: result.code });
}
// result.eventType / result.eventId / result.deliveryId are populated.
```

The verifier matches the worker's signer byte-for-byte: constant-time
HMAC-SHA256 compare, 5-minute replay window. Construction details, the failure
codes, and the signature header format:
[references/webhooks.md](references/webhooks.md).

## 4. Out of scope (the agent must never propose these)

These are rejected by the platform (`AGENTS.md` §1.1). Do not propose an
integration that needs any of them:

- Custodial flows - the platform never holds user funds; keys never leave the
  device unencrypted.
- Chains other than Base, or tokens other than USDC at the wire level (x402,
  payment requests). Other ERC-20s are owner-curated spend-permission entries
  only, not first-class.
- Cross-network payments in one transaction (testnet agent paying a mainnet
  service).
- Agent self-mutating identity (`name`, `slug`, public visibility, disabled
  flag) - dashboard-only forever, even with the broadest scope.
- API-key-driven webhook CRUD or API-key-driven API-key CRUD - `/v1/webhooks/*`
  and `/v1/api-keys/*` mutations are hard-blocked under API-key auth
  (`apikey.unsupported_endpoint`); both are dashboard-only.
- Fiat off-ramps, withdrawals, billing, team management, and raising a spend
  allowance - all dashboard-only, step-up-gated owner actions.

Branch on the stable typed error codes (`apikey.scope_insufficient`,
`apikey.network_mismatch`, `apikey.wallet_not_assigned`, ...) rather than
message text. Full contract: [references/errors.md](references/errors.md).

## 5. References map

Load a reference only when the task needs it (progressive disclosure):

| Reference                                                      | When to read it                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| [references/scopes-and-keys.md](references/scopes-and-keys.md) | Choosing a key shape, scopes, RBAC, the network model.        |
| [references/rest-api.md](references/rest-api.md)               | Calling `/v1/*` over curl: auth, idempotency, pagination.     |
| [references/sdk-node.md](references/sdk-node.md)               | `@blockchain0x/node` quick start and full method surface.     |
| [references/sdk-python.md](references/sdk-python.md)           | `blockchain0x` (Python) quick start and idioms.               |
| [references/x402.md](references/x402.md)                       | Pay and serve x402 endpoints; the X-Payment wire format.      |
| [references/webhooks.md](references/webhooks.md)               | HMAC verify, replay window, failure-mode codes.               |
| [references/mcp.md](references/mcp.md)                         | Connect via the hosted MCP server or `npx @blockchain0x/mcp`. |
| [references/errors.md](references/errors.md)                   | The stable typed error-code contract to branch on.            |
