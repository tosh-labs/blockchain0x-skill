# blockchain0x (Python SDK)

Source of truth: `packages/sdk-python/` and its README. The pre-release
(`0.0.1a0`) ships the HTTP transport, the `api_keys` resource, and
`webhooks.verify`; the payment + x402 surface mirrors the Node SDK and lands in
the sub-plan 21.3 Phase C follow-up. Snippets here are syntax-checked by row 7's
`py_compile` step.

## Install

```bash
pip install blockchain0x
```

Python 3.9+.

## Construct a client

```python
from blockchain0x import Client

client = Client(api_key="sk_test_...")
# Mixed-mode processes can override: Client(api_key=..., network="mainnet")
```

The client pins the network from the key prefix (`sk_test_` -> testnet,
`sk_live_` -> mainnet), exactly like the Node SDK.

## Read (shipped)

```python
def list_keys(client):
    for key in client.api_keys.list()["data"]:
        print(key["id"], key["prefix"])
```

Resources return plain dicts with a `"data"` list and a `"page"` cursor pair,
matching the REST envelope in [rest-api.md](rest-api.md).

## Verify a webhook (shipped; the most important utility)

Drop this at the top of your handler, before touching the body:

```python
from blockchain0x import webhooks


def receive_webhook(req, raw_body, secret):
    result = webhooks.verify(headers=req.headers, raw_body=raw_body, secret=secret)
    if not result.ok:
        return {"code": result.code}, 400
    # result.event_type / result.event_id / result.delivery_id are populated
    return process_event(raw_body, result.event_type)
```

The verifier reads `X-Blockchain0x-Signature` (`t=<ts>,v1=<hex>` or bare hex),
falls back to `X-Blockchain0x-Timestamp`, rejects drift beyond the 5-minute
window with `webhook.timestamp_outside_window`, and compares in constant time.
For exception flow pass `raise_on_fail=True` and catch `WebhookSignatureError`.
Details: [webhooks.md](webhooks.md).

## Errors

```python
from blockchain0x import ApiKeyError


def safe_list(client):
    try:
        return client.api_keys.list()
    except ApiKeyError as e:
        if e.code == "apikey.scope_insufficient":
            return None  # mint a fresh key with more scope
        raise
```

Two classes: `Blockchain0xError` (base) and `ApiKeyError` (subclass for
`apikey.*` codes). Always branch on `.code`, never on `.message`. The full code
contract is in [errors.md](errors.md).

## Idempotency

`POST` / `PATCH` / `DELETE` requests carry an `Idempotency-Key`; the SDK mints a
uuid4 if you do not pass `idempotency_key="..."`. Thread a stable key across
retries or across processes (for example a cron job hashing its input).

## Roadmap parity with Node

The payment, payment-request, and x402 surfaces mirror `@blockchain0x/node`
([sdk-node.md](sdk-node.md)) and the shared REST contract
([rest-api.md](rest-api.md)); the wire format is identical across languages, so a
Python service accepts payments from a Node client and vice versa.
