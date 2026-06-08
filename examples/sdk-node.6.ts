const settled = await client.paymentRequests.settle({
  paymentRequestId: 'pr_01HQ',
  body: {
    txHash: '0x' + '0'.repeat(64),
    payerAddress: '0xabc0000000000000000000000000000000000000',
    amountUsdcVerified: '10.00',
  },
});
// settled.status === 'settled'; settled.settledTxHash / settled.settledAt
