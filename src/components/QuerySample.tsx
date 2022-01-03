import { LCDClient } from '@terra-money/terra.js';
import React, { useEffect, useState } from 'react';
import { toFixed, fromMicroAmount, calculateLTV, formatCoin } from 'utils/helpers';
import { fetchLoanData } from 'utils/api';

const ADDRESS = 'terra1kq4aet5n0qaau4lcsurvgqrf0aevsjuhk6r40m';

export function QuerySample({ lcd, address }: { lcd: LCDClient, address: string }) {

  const [bank, setBank] = useState<null | string[]>();
  const [ltv, setLTV] = useState<null | string>();
  const [loanAmount, setLoanAmount] = useState<null | number>();
  const [borrowLimit, setBorrowLimit] = useState<null | number>();

  useEffect(() => {
    async function fetchData() {
      // if (!ADDRESS) return setBank(null);

      // fetch wallet info
      const [coins] = await lcd.bank.balance(ADDRESS);
      const filteredCoins = coins.filter(c => fromMicroAmount(Number(c.amount)) > 0);
      setBank(filteredCoins.map(coin => formatCoin(coin)));

      // fetch loan info
      async function refresh(address: string): Promise<void> {
        const [loan, limit] = await fetchLoanData(lcd, address);

        setLoanAmount(fromMicroAmount(Number(loan)));
        setBorrowLimit(fromMicroAmount(Number(limit)));

        setTimeout(refresh, 5000);
      }

      refresh(ADDRESS);
    }

    fetchData();
  }, [lcd]);

  const amount = (c: string) => (<div key={c}>{c}</div>);

  return (
    <div>
      <h1>Wallet</h1>
      {bank && <div>
        {bank.map(amount)}
      </div>}
      {!address && <p>Wallet not connected!</p>}
    </div>
  );
}
