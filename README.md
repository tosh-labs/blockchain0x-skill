# Blockchain0x Agent Skill (`blockchain0x-wallet`)

[![Agent Skill](https://img.shields.io/badge/Agent_Skill-installable-blueviolet.svg)](https://github.com/Tosh-Labs/blockchain0x-skill)
[![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-black.svg)](https://github.com/Tosh-Labs/blockchain0x-skill)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**Drop this skill into your AI agent and it knows the whole Blockchain0x integration surface.**
It teaches how to pick and scope an API key, read balances and transactions,
request and settle USDC payments, pay x402 endpoints, verify inbound webhooks,
and connect through the hosted MCP server. It works with
[Blockchain0x](https://blockchain0x.com), the non-custodial AI-agent wallet
platform on Base.

This is knowledge, not custody. The skill ships documentation plus
snippet-tested code recipes only. It bundles no runnable executable, holds no
secret, and adds no new signing path: a fully-read skill cannot move funds or
leak a key, because it contains neither. Capability still comes only from an API
key you mint and scope yourself, enforced server-side.

## Install

Two supported paths, same skill bytes.

Portable Agent Skill (Claude Code, the Claude apps, the Claude Agent SDK, or any
runtime that reads the open [Agent Skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills)
format) - copy the skill into your skills directory:

```bash
git clone https://github.com/Tosh-Labs/blockchain0x-skill
cp -r blockchain0x-skill ~/.claude/skills/blockchain0x-wallet
```

Claude Code plugin (one-step install from the marketplace):

```bash
/plugin marketplace add Tosh-Labs/blockchain0x-skill
/plugin install blockchain0x
```

## Quick start

Once installed, the agent loads `SKILL.md` automatically when a task matches its
trigger (integrating Blockchain0x wallets, USDC payments, or x402 into agent
code). It then pulls the relevant `references/<topic>.md` file into context on
demand. No configuration is required to read the skill.

To run the integrations the skill teaches, set `BLOCKCHAIN0X_API_KEY` (a
`sk_test_*` testnet or `sk_live_*` mainnet key from your Blockchain0x dashboard).
The SDKs and MCP server forward it to the backend and hold no secret of their
own.

## Tool surface

The skill teaches the agent the four canonical wallet tasks plus how to connect,
each mapped to the API scope it needs:

| Task                       | Scope                        | Reference                                                                      |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| Read balance and history   | `read_wallet_metadata`       | `references/rest-api.md`, `references/sdk-node.md`, `references/sdk-python.md` |
| Request + settle a payment | `pay_bills`, `receive_money` | `references/sdk-node.md`, `references/sdk-python.md`                           |
| Pay an x402 endpoint       | `pay_bills`                  | `references/x402.md`                                                           |
| Verify an inbound webhook  | n/a (HMAC verify)            | `references/webhooks.md`                                                       |
| Connect via MCP            | per tool                     | `references/mcp.md`                                                            |

The full scope and key-shape decision tree lives in
`references/scopes-and-keys.md`; the stable typed error contract lives in
`references/errors.md`.

## Supported runtimes

| Runtime                             | Install path                         |
| ----------------------------------- | ------------------------------------ |
| Claude Code                         | plugin marketplace or portable skill |
| Claude apps (desktop, web)          | portable skill                       |
| Claude Agent SDK                    | portable skill                       |
| Any open Agent Skills format reader | portable skill                       |

The skill documents the shipped `@blockchain0x/node`, `blockchain0x` (Python),
and `@blockchain0x/x402` SDKs and the hosted MCP server; it re-implements none of
them. See [docs.blockchain0x.com/sdks](https://docs.blockchain0x.com/sdks) for
the SDK versions and support matrix.

## Links

- Landing page: [blockchain0x.com/integrations/skill](https://blockchain0x.com/integrations/skill)
- Docs: [docs.blockchain0x.com](https://docs.blockchain0x.com)
- Public mirror (installable): [github.com/Tosh-Labs/blockchain0x-skill](https://github.com/Tosh-Labs/blockchain0x-skill)
- Agent Skills format: [docs.claude.com/en/docs/agents-and-tools/agent-skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills)
- Issues + contributions: [github.com/Tosh-Labs/blockchain0x-app](https://github.com/Tosh-Labs/blockchain0x-app/issues)
- Changelog: [CHANGELOG.md](./CHANGELOG.md)

## License

MIT. See [LICENSE](./LICENSE).
