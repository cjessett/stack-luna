require('dotenv').config()

import { fetchLoanData, queryTerraswapLunaUstBalance, lunaUstLPSimulation, fabricateTerraswapWithdrawLunaUst } from './api';
import { fromMicroAmount, calculateLTV, display, handleLogError } from './helpers';
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

  const target = borrowLimit * ltvParams.TARGET / ltvParams.LIMIT;
  const toRepay = loanAmount - target;

  return { ltv, toRepay };
}

async function liquidateEarn(toRepay: number): Promise<number> {
  const totalDeposit = await anchor.earn.getTotalDeposit(opts);

  if (Number(totalDeposit) < 1) return 0;

  const repayAble = toRepay > Number(totalDeposit) ? Number(totalDeposit) : toRepay;

  // get aUst rate
  const { exchange_rate } = await queryMarketEpochState({ lcd, market: MARKET_DENOMS.UUSD })(addressProvider);
  const aust = (Number(repayAble) / Number(exchange_rate)).toString();

  // widthdraw
  await anchor.earn.withdrawStable({ ...opts, amount: aust }).execute(wallet, gasParameters);

  return repayAble
}

async function liquidateLP(toRepay: number): Promise<number[]> {
  // find smaller of toRepay and ustAvailable
  const [lpBalance, ustAvailable] = await ustAvailableFromLunaUstLP(address);
  const repayAble = toRepay > ustAvailable ? ustAvailable : toRepay;

  // calculate amount of LP to liquidate
  const amount = ((repayAble / fromMicroAmount(ustAvailable)) * lpBalance).toString();
  const withdrawMsg = fabricateTerraswapWithdrawLunaUst({ address, amount })(addressProvider);

  const tx = await wallet.createAndSignTx({ msgs: withdrawMsg, ...gasParameters });
  await lcd.tx.broadcast(tx);

  return [Number(amount), repayAble];
}

async function ustAvailableFromLunaUstLP(address: string): Promise<number[]> {
  const { balance } = await queryTerraswapLunaUstBalance({ lcd, address });
  const [_, ust] = await lunaUstLPSimulation(lcd, addressProvider, Number(balance));

  return [fromMicroAmount(Number(balance)), ust];
}

async function repay(amount: string) {
  return await anchor.borrow.repay({ ...opts, amount }).execute(wallet, gasParameters);
}

export async function main() {
  let liquidated = 0;
  try {
    const { ltv, toRepay } = await fetchLoan();

    display(ltv);

    // if LTV > UPPER repay to TARGET
    if (ltv > ltvParams.UPPER) {
      console.log(`Repaying $${toRepay}`);

      // TODO: use wallet balance first;

      liquidated = await liquidationStrat.earn(toRepay); // liquidate Earn

      if (liquidated < toRepay) { // liquidate LP
        const [lpAmount, liquidatedUst] = await liquidationStrat.lp(toRepay - liquidated);

        liquidated += liquidatedUst;

        console.log(`Liquidated ${lpAmount} LP ($${liquidatedUst})`);
      }

      await repay(liquidated.toString());

      console.log(`*** Repaid $${liquidated} ***`);
    }
  } catch (error: any) {
    handleLogError(error);
  }

  setTimeout(main, 5000);
}
