import { onchainTable } from "ponder";

// Daily collateral asset prices
export const Prices = onchainTable("prices", (t) => ({
  timestamp: t.bigint().primaryKey(),
  ysyBOLD: t.real().notNull(),
  scrvUSD: t.real().notNull(),
  sUSDS: t.real().notNull(),
  sfrxUSD: t.real().notNull(),
  tBTC: t.real().notNull(),
  WBTC: t.real().notNull(),
}));

// Daily USDaf interest minted to SP
export const InterestRewards = onchainTable("interest_rewards", (t) => ({
  timestamp: t.bigint().primaryKey(),
  ysyBOLD: t.real().notNull().default(0),
  scrvUSD: t.real().notNull().default(0),
  sUSDS: t.real().notNull().default(0),
  sfrxUSD: t.real().notNull().default(0),
  tBTC: t.real().notNull().default(0),
  WBTC: t.real().notNull().default(0),
}));

// Daily collateral asset balances from liquidation in SP
export const LiquidationRewards = onchainTable("liquidation_rewards", (t) => ({
  timestamp: t.bigint().primaryKey(),
  ysyBOLD: t.real().notNull().default(0),
  scrvUSD: t.real().notNull().default(0),
  sUSDS: t.real().notNull().default(0),
  sfrxUSD: t.real().notNull().default(0),
  tBTC: t.real().notNull().default(0),
  WBTC: t.real().notNull().default(0),
}));

// Current USDaf balances in SP
export const CurrentSpUsdafBalances = onchainTable(
  "current_sp_usdaf_balances",
  (t) => ({
    id: t.hex().primaryKey(), // this table only has 1 record, set to zeroAddress
    lastUpdated: t.bigint().notNull(), // actual block ts
    ysyBOLD: t.real().notNull().default(0),
    scrvUSD: t.real().notNull().default(0),
    sUSDS: t.real().notNull().default(0),
    sfrxUSD: t.real().notNull().default(0),
    tBTC: t.real().notNull().default(0),
    WBTC: t.real().notNull().default(0),
  })
);

// Daily USDaf balances in SP
export const SpUsdafBalances = onchainTable("sp_usdaf_balances", (t) => ({
  timestamp: t.bigint().primaryKey(),
  ysyBOLD: t.real().notNull(),
  scrvUSD: t.real().notNull(),
  sUSDS: t.real().notNull(),
  sfrxUSD: t.real().notNull(),
  tBTC: t.real().notNull(),
  WBTC: t.real().notNull(),
}));

// Current user deposits in SP, each column stores the current USDaf amount in the SP as contributed by user
export const CurrentSpDepositorsBalances = onchainTable(
  "current_sp_depositors_balances",
  (t) => ({
    depositor: t.hex().primaryKey(),
    lastUpdated: t.bigint().notNull(), // actual block ts
    ysyBOLD: t.real().notNull().default(0),
    scrvUSD: t.real().notNull().default(0),
    sUSDS: t.real().notNull().default(0),
    sfrxUSD: t.real().notNull().default(0),
    tBTC: t.real().notNull().default(0),
    WBTC: t.real().notNull().default(0),
  })
);
