# Scopes, key shapes, RBAC, and the network model

Source of truth: `docs/concept-api-key-types.md`, the `@blockchain0x/node` README,
and `AGENTS.md` §1.1. This page is the deep reference behind SKILL.md section 1.

## Two key shapes

| Shape       | Bind                          | Mint body                                                         | Use when                                                                  |
| ----------- | ----------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Wallet-only | ONE agent via `agentId`       | `{ label, scopes, agentId }`                                      | The consumer IS one wallet (autonomous bot, chat agent paying its bills). |
| Workspace   | N wallets + workspace surface | `{ label, workspaceScopes?, walletAssignments?, expiresInDays? }` | A human operator spanning many wallets or the workspace surface.          |

The two mint bodies are mutually exclusive: a wallet-only key carries `agentId`
and inline `scopes`; a workspace key omits `agentId` and provides
`workspaceScopes` and/or `walletAssignments`. Pick the most restrictive shape
that does the job; rotating later is cheap.

Decision questions (from `docs/concept-api-key-types.md`):

1. Does the consumer "be" one wallet? Yes, wallet-only; no, workspace.
2. Does it need access to more than one wallet? No, wallet-only; yes, workspace.
3. Does it touch the workspace surface (members, audit, usage, public copy)?
   Yes, workspace with the matching scope; no, wallet-only suffices.

## Wallet scopes (four; identical in both shapes)

| Scope                    | Grants                                                                      |
| ------------------------ | --------------------------------------------------------------------------- |
| `read_wallet_metadata`   | Read balances, transactions, earnings, audit, spend permissions, usage.     |
| `manage_wallet_metadata` | Superset of read; update public profile copy (tagline, social, about, SEO). |
| `pay_bills`              | Create payments, capped by the agent's spend permission allowance.          |
| `receive_money`          | Create payment requests / invoices and settle them on-chain.                |

A wallet-only key is fenced to its one agent: it can ONLY call agent-scoped
routes (get THIS wallet, read its balances/transactions, pay its bills, invoice
on its behalf). It CANNOT call workspace-level routes such as listing or
aggregating across all agents - those return `401 auth.invalid_session` (see
[errors.md](errors.md) "Common pitfalls"), not a scope error. To span wallets or
list agents, mint a workspace key.

## Workspace scopes (two; workspace shape only)

| Scope                       | Grants                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `read_workspace`            | Read workspace metadata, list members + agents, read audit log, read usage.              |
| `manage_workspace_metadata` | Superset of `read_workspace`; update workspace public copy (description, branding, SEO). |

## Mint a wallet-only key

```ts
import { createClient } from '@blockchain0x/node';

const client = createClient({ apiKey: process.env.BLOCKCHAIN0X_API_KEY! });

const key = await client.apiKeys.create({
  label: 'Trading bot',
  agentId: 'agt_01HQXTRADING',
  scopes: ['read_wallet_metadata', 'pay_bills'],
});
console.log(key.secret); // shown ONCE - persist it in your secret store
```

## Mint a workspace key

The shipped SDK `apiKeys.create` body is wallet-only (`{ label, scopes, agentId }`).
Workspace keys are minted from the dashboard or via the REST endpoint with the
workspace body (`docs/concept-api-key-types.md` "Lifecycle"); the typed SDK
create does not yet carry `workspaceScopes` / `walletAssignments`.

```bash
curl -X POST https://api.blockchain0x.com/v1/api-keys \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-Network: testnet" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Treasury daily reconciliation",
    "workspaceScopes": ["read_workspace"],
    "walletAssignments": [
      { "agentId": "agt_trading", "scopes": ["read_wallet_metadata"] },
      { "agentId": "agt_settlement", "scopes": ["read_wallet_metadata"] }
    ],
    "expiresInDays": 30
  }'
```

The returned `secret` is shown ONCE. `expiresInDays` is optional (7 / 30 / 60 /
90).

## RBAC-bounded minting (workspace flavor)

The server enforces one rule: **the minter cannot grant a scope they do not hold
themselves** (`docs/concept-api-key-types.md` §3.4).

| Minter's workspace role  | Workspace scopes grantable                    | Per-wallet scopes grantable                                           |
| ------------------------ | --------------------------------------------- | --------------------------------------------------------------------- |
| Owner / Admin            | `read_workspace`, `manage_workspace_metadata` | All 4 wallet scopes on every wallet                                   |
| Developer (wallet-level) | `read_workspace`                              | All 4 wallet scopes on wallets the user has Developer+ grants on      |
| Viewer (wallet-level)    | `read_workspace`                              | `read_wallet_metadata` only on wallets the user has Viewer+ grants on |

Over-grant rejects with `apikey.role_insufficient_for_grants` (HTTP 403). Ask a
workspace Admin to mint the key.

## Locked-out fields (no scope unlocks these)

Both shapes hard-block these even when the surrounding scope is present
(`docs/concept-api-key-types.md`, `AGENTS.md` §1.1):

- Agent identity: `name`, `slug`, `publicStatus`, `disabled`.
- Workspace identity: `name`, `slug`, `defaultNetwork`, `disabled`, `ownerUserId`.
- API-key CRUD and webhook CRUD (mint / rotate / revoke / create / update /
  delete) - dashboard-only; an API key cannot mint another key
  (`apikey.unsupported_endpoint`).
- Withdrawals, billing, team management, raising a spend allowance - step-up,
  dashboard-only.

Identity fields silently strip from a PATCH body with a warn-log; the rest of
the body still applies.

## Network model (test vs live)

The key prefix encodes the network (`@blockchain0x/node` README, `AGENTS.md`
§1.1):

- `sk_test_...` keys talk to Base Sepolia (testnet).
- `sk_live_...` keys talk to Base mainnet.

The SDK reads the network from the key and stamps `X-Network: mainnet | testnet`
on every request. A mismatched caller (for example a test key asserting
`network: 'mainnet'`) is rejected with `apikey.network_mismatch`. There are no
cross-network payments in one transaction: a testnet agent paying a mainnet
service is rejected. The bound agent, workspace, and network are all fixed by the
key, so you never thread `agentId` or `workspaceId` through a call.

See also [rest-api.md](rest-api.md) for the `X-Network` header on raw REST calls
and [errors.md](errors.md) for the full typed error contract.
