const key = await client.apiKeys.create({
  label: 'Trading bot',
  agentId: 'agt_01HQXTRADING',
  scopes: ['read_wallet_metadata', 'pay_bills'],
});
console.log(key.secret); // shown ONCE
