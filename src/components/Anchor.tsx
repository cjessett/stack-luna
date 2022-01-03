import React, { useEffect, useState } from 'react';
import { LCDClient } from '@terra-money/terra.js';
import { fromMicroAmount, calculateLTV } from 'utils/helpers';
import { fetchLoanData } from 'utils/api';

const ADDRESS = 'terra1kq4aet5n0qaau4lcsurvgqrf0aevsjuhk6r40m';

export function Anchor({ lcd }: { lcd: LCDClient }) {

  const [ltv, setLTV] = useState<null | string>();
  const [loanAmount, setLoanAmount] = useState<null | number>();
  const [borrowLimit, setBorrowLimit] = useState<null | number>();

  useEffect(() => {
    async function refresh(address: string): Promise<void> {
      const [loan, limit] = await fetchLoanData(lcd, address);

      setLoanAmount(fromMicroAmount(loan));
      setBorrowLimit(fromMicroAmount(limit));

      setTimeout(() => refresh(ADDRESS), 5000);
    }

    refresh(ADDRESS);
  }, [lcd]);

  return (
    <div>
      <h1>Anchor LTV</h1>
      <h2>{(loanAmount && borrowLimit) && `${calculateLTV(loanAmount, borrowLimit)}%`}</h2>
    </div>
  );
}
