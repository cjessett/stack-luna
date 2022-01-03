import { MARKET_DENOMS, OperationGasParameters } from '@anchor-protocol/anchor.js';

export const address = process.env.WALLET_ADDRESS || '';

export const ltvParams = {
  LIMIT: Number(process.env.LTV_LIMIT) || 0.6,
  MAX: Number(process.env.LTV_MAX) || 60,
  UPPER: Number(process.env.LTV_TRIGGER) || 50,
  TARGET: Number(process.env.LTV_TARGET) || 0.45,
};

export const gasParameters: OperationGasParameters = {
  gasAdjustment: 1.4,
  gasPrices: "0.15uusd",
}

export const opts = {
  market: MARKET_DENOMS.UUSD,
  address,
}