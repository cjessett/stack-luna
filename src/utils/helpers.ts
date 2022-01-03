const clui = require('clui');
import { Coin } from '@terra-money/terra.js';
import { ltvParams } from './constants';

const Gauge = clui.Gauge;

export const toFixed = (num: number): number => Number(num.toFixed(2));

export const fromMicroAmount = (microAmount: number): number => toFixed(Number(microAmount) / 1_000_000);

export const calculateLTV = (loanAmount: number, borrowLimit: number): number => toFixed((loanAmount * 0.6 / borrowLimit) * 100);

export const formatCoin = (c: Coin): string => `${fromMicroAmount(toFixed(Number(c.amount)))} ${c.denom.slice(1, 4)}`;

export const jsonToBase64 = (obj: object): string => Buffer.from(JSON.stringify(obj)).toString('base64');

export function display(ltv: number) {
  const gauge = Gauge(ltv, ltvParams.MAX, 60, ltvParams.UPPER - 5, `${ltv}%`);
  // process.stdout.cursorTo(0);
  console.log(gauge);
}
