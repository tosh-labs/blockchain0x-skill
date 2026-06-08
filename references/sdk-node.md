# @blockchain0x/node (TypeScript / Node SDK)

Source of truth: the shipped resource types in `packages/sdk-node/src/` (the
README prose can lag; the signatures below are taken from the code). Use these
exact shapes - they are what the row 7 snippet gate compiles against.

## Install

```bash
npm install @blockchain0x/node@alpha
```

Node 18+ (native `fetch` + `AbortController`).

## Construct a client

```ts
import { createClient } from '@blockchain0x/node';

const client = createClient({
  apiKey: process.env.BLOCKCHAIN0X_API_KEY!, // sk_test_... or sk_live_...
  // baseUrl?, network?, timeoutMs? are all optional
});
```

The key prefix fixes the network (`sk_test_` -> Base Sepolia, `sk_live_` -> Base
mainnet); the SDK stamps `X-Network` for you.

## Read balances + transactions (`read_wallet_metadata`)

```ts
const agent = await client.agents.get('agt_01HQX5'); // AgentSummary
const page = await client.agents.list({ limit: 25 }); // cursor + limit
const usage = await client.apiKeys.usage({ windowDays: 1 });
```

`agents.get(id)`, `agents.list({ cursor?, limit? })`, and
`apiKeys.usage({ windowDays?, agentId?, apiKeyId?, mode? })` are all read calls
covered by `read_wallet_metadata`.

## Create a payment (`pay_bills`)

The body is `{ agentId, to, amountWei, token?, metadata? }`. `amountWei` is the
on-chain integer amount as a decimal string (base units); see the `PaymentCreate`
schema in `apps/backend/openapi/openapi.yaml` for the exact units.

```ts
const payment = await client.payments.create({
  agentId: 'agt_01HQX5',
  to: '0xabc0000000000000000000000000000000000000',
  amountWei: '12500000',
});
```

`payments.create` auto-attaches an `Idempotency-Key` (minted once per call) and
defaults `retry: 'off'` to avoid double-spends. Opt in with options:

```ts
await client.payments.create(
  { agentId: 'agt_01HQX5', to: '0xabc0000000000000000000000000000000000000', amountWei: '100000' },
  { idempotencyKey: 'order-42', retry: 'default' }
);
```

## Settle a payment request (`receive_money`)

The SDK ships `paymentRequests.settle`; creating the request is a REST call (see
[rest-api.md](rest-api.md)). Settle posts the on-chain proof tuple:

```ts
const settled = await client.paymentRequests.settle({
  paymentRequestId: 'pr_01HQ',
  body: {
    txHash: '0x' + '0'.repeat(64),
    payerAddress: '0xabc0000000000000000000000000000000000000',
    amountUsdcVerified: '10.00',
  },
});
// settled.status === 'settled'; settled.settledTxHash / settled.settledAt
```

## Mint a wallet-only key

The shipped `apiKeys.create` body is `{ label, scopes, agentId? }`
(wallet-only). Workspace-key creation is a REST / dashboard action
([scopes-and-keys.md](scopes-and-keys.md)); the typed SDK create does not yet
carry `workspaceScopes` / `walletAssignments`.

```ts
const key = await client.apiKeys.create({
  label: 'Trading bot',
  agentId: 'agt_01HQXTRADING',
  scopes: ['read_wallet_metadata', 'pay_bills'],
});
console.log(key.secret); // shown ONCE
```

List, rotate, and revoke take the id as a positional string:

```ts
await client.apiKeys.list({ limit: 25 });
await client.apiKeys.rotate('ak_01HQ');
await client.apiKeys.revoke('ak_01HQ');
```

## Webhooks

Register and rotate (CRUD requires a dashboard-minted context; see
[webhooks.md](webhooks.md)):

```ts
const wh = await client.webhooks.create({
  url: 'https://api.your-app.com/webhook',
  events: ['payment.received', 'wallet.deployed'],
});
console.log(wh.signingSecret); // store once
await client.webhooks.rotateSecret(wh.id);
```

Verify an inbound delivery (the most important utility this SDK ships):

```ts
import { webhooks } from '@blockchain0x/node';

const result = webhooks.verify({
  headers: req.headers,
  rawBody: req.body, // Buffer or string, the exact bytes on the wire
  secret: process.env.BLOCKCHAIN0X_WEBHOOK_SECRET!,
});
if (!result.ok) {
  return res.status(400).json({ code: result.code });
}
// result.eventType / result.eventId / result.deliveryId
```

Construction + failure codes: [webhooks.md](webhooks.md).

## Structured errors

```ts
import { Blockchain0xError, ApiKeyError, WebhookSignatureError } from '@blockchain0x/node';

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
    throw err;
  }
}
```

`WebhookSignatureError` is thrown only when you opt into exception-based webhook
verification. The full code contract is in [errors.md](errors.md).
