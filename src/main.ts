import { queryTerraswapPool } from '@anchor-protocol/anchor.js';
import { init } from './utils/terra';
import { queryTerraswapLunaUstBalance, Result } from './utils/api';
import { fromMicroAmount } from './utils/helpers';

const address = 'terra1kq4aet5n0qaau4lcsurvgqrf0aevsjuhk6r40m';

async function lunaUstLPSimulation(lcd: any, provider: any, lp: number) {
  const pairAddress = 'terra1tndcaqxkpc5ce9qee5ggqf430mr2z3pefe5wj6';

  const { assets, total_share } = await queryTerraswapPool({ lcd, pair_contract_address: pairAddress })(provider);

  const uusd = assets[0].amount;
  const uluna = assets[1].amount;

  const ust = Number(uusd) * lp / Number(total_share);
  const luna = Number(uluna) * lp / Number(total_share);

  return [luna, ust];
}

async function ustAvailableFromLunaUstLP(address) {
  const { lcd, addressProvider } = init();
  const { balance } = await queryTerraswapLunaUstBalance({ lcd, address });
  const [_, ust] = await lunaUstLPSimulation(lcd, addressProvider, Number(balance));

  return fromMicroAmount(ust);
}

ustAvailableFromLunaUstLP(address);