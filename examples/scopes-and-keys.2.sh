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
