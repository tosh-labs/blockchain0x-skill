import { buildPaymentHeader, parsePaymentHeader } from '@blockchain0x/x402';

const header = buildPaymentHeader({
  scheme: 'exact-usdc',
  version: 1,
  paymentRequestId: 'pr_01HQ',
  txHash: '0x' + '0'.repeat(64),
  payerAddress: '0xabc0000000000000000000000000000000000000',
  amountUsdc: '0.10',
  network: 'testnet',
});
const payment = parsePaymentHeader(header); // -> ExactUsdcPayment
