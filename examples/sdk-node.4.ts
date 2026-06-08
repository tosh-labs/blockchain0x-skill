const payment = await client.payments.create({
  agentId: 'agt_01HQX5',
  to: '0xabc0000000000000000000000000000000000000',
  amountWei: '12500000',
});
