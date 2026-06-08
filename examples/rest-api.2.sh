curl -X POST https://api.blockchain0x.com/v1/payments \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "X-Network: testnet" \
  -H "Idempotency-Key: 1f3c9b2a-0e7d-4a51-9c3e-6b2a1f3c9b2a" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agt_01HQX5","to":"0xabc0000000000000000000000000000000000000","amountWei":"12500000"}'
