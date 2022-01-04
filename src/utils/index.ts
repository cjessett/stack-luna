require('dotenv').config()

import { fetchLoanData, queryTerraswapLunaUstBalance, lunaUstLPSimulation, fabricateTerraswapWithdrawLunaUst } from './api';
import { fromMicroAmount, calculateLTV, display } from './helpers';
import { MARKET_DENOMS, queryMarketEpochState } from '@anchor-protocol/anchor.js';
import { init } from './terra';
import { ltvParams, address, gasParameters, opts } from './constants';

const { addressProvider, lcd, wallet, anchor } = init();

const liquidationStrat = {
  earn: liquidateEarn,
  lp: liquidateLP,
}

async function fetchLoan() {
  const result = await fetchLoanData(lcd, address);
  const [loanAmount, borrowLimit] = result.map(fromMicroAmount);
  const ltv = calculateLTV(loanAmount, borrowLimit);

  display(ltv);

  const target = borrowLimit * ltvParams.TARGET / ltvParams.LIMIT;
  const toRepay = loanAmount - target;

  return { ltv, toRepay };
}

async function liquidateEarn(toRepay: number): Promise<number> {
  const totalDeposit = await anchor.earn.getTotalDeposit(opts);
  const repayAble = toRepay > Number(totalDeposit) ? Number(totalDeposit) : toRepay;

  // get aUst rate
  const { exchange_rate } = await queryMarketEpochState({ lcd, market: MARKET_DENOMS.UUSD })(addressProvider);
  const aust = (Number(repayAble) / Number(exchange_rate)).toString();

  // widthdraw
  await anchor.earn.withdrawStable({ ...opts, amount: aust }).execute(wallet, gasParameters);

  return repayAble
}

async function liquidateLP(toRepay: number): Promise<number> {
  // find smaller of toRepay and ustAvailable
  const [lpBalance, ustAvailable] = await ustAvailableFromLunaUstLP(address);
  const repayAble = toRepay > ustAvailable ? ustAvailable : toRepay;

  // calculate amount of LP to liquidate
  const amount = (repayAble / ustAvailable) * lpBalance;
  const withdrawMsg = fabricateTerraswapWithdrawLunaUst({ address, amount: amount.toString() })(addressProvider);

  const tx = await wallet.createAndSignTx({ msgs: withdrawMsg, ...gasParameters });
  await lcd.tx.broadcast(tx);

  return repayAble;
}

async function ustAvailableFromLunaUstLP(address: string): Promise<number[]> {
  const { balance } = await queryTerraswapLunaUstBalance({ lcd, address });
  const [_, ust] = await lunaUstLPSimulation(lcd, addressProvider, Number(balance));

  return [balance, ust].map(Number).map(fromMicroAmount);
}

async function repay(amount: string) {
  return await anchor.borrow.repay({ ...opts, amount }).execute(wallet, gasParameters);
}

export async function main() {
  let liquidated = 0;
  const { ltv, toRepay } = await fetchLoan();

  // if LTV > UPPER repay to TARGET
  if (ltv > ltvParams.UPPER) {
    liquidated = await liquidationStrat.earn(toRepay); // liquidate Earn

    if (liquidated < toRepay) { // liquidate LP
      liquidated += await liquidationStrat.lp(toRepay - liquidated);
    }

    await repay(liquidated.toString());
    console.log(`*** Repaid $${liquidated} ***`);
  }

  setTimeout(main, 5000);
}
