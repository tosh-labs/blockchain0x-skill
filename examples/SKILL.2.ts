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
