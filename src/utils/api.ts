import { LCDClient, Dec, Int, MsgExecuteContract } from '@terra-money/terra.js';
import { jsonToBase64 } from './helpers';
import {
  queryMarketBorrowerInfo,
  queryOverseerBorrowLimit,
  MARKET_DENOMS,
  AddressProviderFromJson,
  columbus5,
  AddressProvider,
  queryTerraswapPool,
} from '@anchor-protocol/anchor.js';

interface Option {
  address: string;
  amount: string;
}

export interface Result {
  balance: string;
}

interface PoolParams {
  lcd: LCDClient;
  address: string;
}

const addressProvider = new AddressProviderFromJson(columbus5);

export async function fetchLoanData(lcd: LCDClient, borrower: string): Promise<number[]> {
  const block_height = await getBlockHeight(lcd);
  const opts = { lcd, market: MARKET_DENOMS.UUSD, borrower, block_height };

  const [{ loan_amount }, { borrow_limit }] = await Promise.all([
    queryMarketBorrowerInfo(opts)(addressProvider),
    queryOverseerBorrowLimit({ ...opts, overseer: MARKET_DENOMS.UUSD })(addressProvider),
  ]);

  return [Number(loan_amount), Number(borrow_limit)];
}

export async function getBlockHeight(lcd: LCDClient): Promise<number> {
  const { block: { last_commit: { height } } } = await lcd.tendermint.blockInfo();

  return Number(height);
}

// amount in non-micro form
export const fabricateTerraswapWithdrawLunaUst = ({
  address,
  amount,
}: Option) => (addressProvider: AddressProvider): MsgExecuteContract[] => {

  const lpToken = 'terra17dkr9rnmtmu7x4azrpupukvur2crnptyfvsrvr';
  const pairAddress = 'terra1tndcaqxkpc5ce9qee5ggqf430mr2z3pefe5wj6';

  return [
    new MsgExecuteContract(address, lpToken, {
      send: {
        contract: pairAddress,
        amount: new Int(new Dec(amount).mul(1000000)).toString(),
        msg: jsonToBase64({
          withdraw_liquidity: {},
        }),
      },
    }),
  ];
};

export async function queryTerraswapLunaUstBalance({ lcd, address }: PoolParams): Promise<Result> {
  const response = await lcd.wasm.contractQuery(
    'terra17dkr9rnmtmu7x4azrpupukvur2crnptyfvsrvr',
    {
      balance: { address },
    },
  );
  return response as Result;
};

export async function lunaUstLPSimulation(lcd: any, provider: any, lp: number) {
  const pairAddress = 'terra1tndcaqxkpc5ce9qee5ggqf430mr2z3pefe5wj6';

  const { assets, total_share } = await queryTerraswapPool({ lcd, pair_contract_address: pairAddress })(provider);

  const uusd = assets[0].amount;
  const uluna = assets[1].amount;

  const ust = Number(uusd) * lp / Number(total_share);
  const luna = Number(uluna) * lp / Number(total_share);

  return [luna, ust];
}


