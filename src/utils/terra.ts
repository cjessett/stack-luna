import { LCDClient, MnemonicKey, Wallet } from '@terra-money/terra.js';
import { AddressProviderFromJson, Anchor, columbus5 } from '@anchor-protocol/anchor.js';

export function init() {
  const addressProvider = new AddressProviderFromJson(columbus5);
  const lcd = new LCDClient({ URL: 'https://lcd.terra.dev', chainID: 'columbus-5' });
  const key = new MnemonicKey({ mnemonic: process.env.MNEMONIC });
  const wallet = new Wallet(lcd, key);
  const anchor = new Anchor(lcd, addressProvider);

  return { addressProvider, lcd, wallet, anchor };
}
