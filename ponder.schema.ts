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
  ysyBOLD: t.bigint().notNull().default(0n),
  scrvUSD: t.bigint().notNull().default(0n),
  sUSDS: t.bigint().notNull().default(0n),
  sfrxUSD: t.bigint().notNull().default(0n),
  tBTC: t.bigint().notNull().default(0n),
  WBTC: t.bigint().notNull().default(0n),
}));

// Daily collateral asset balances from liquidation in SP
export const LiquidationRewards = onchainTable("liquidation_rewards", (t) => ({
  timestamp: t.bigint().primaryKey(),
  ysyBOLD: t.bigint().notNull().default(0n),
  scrvUSD: t.bigint().notNull().default(0n),
  sUSDS: t.bigint().notNull().default(0n),
  sfrxUSD: t.bigint().notNull().default(0n),
  tBTC: t.bigint().notNull().default(0n),
  WBTC: t.bigint().notNull().default(0n),
}));

// Current USDaf balances in SP
export const CurrentSpUsdafBalances = onchainTable(
  "current_sp_usdaf_balances",
  (t) => ({
    id: t.hex().primaryKey(), // this table only has 1 record, set to zeroAddress
    lastUpdated: t.bigint().notNull(), // actual block ts
    ysyBOLD: t.bigint().notNull().default(0n),
    scrvUSD: t.bigint().notNull().default(0n),
    sUSDS: t.bigint().notNull().default(0n),
    sfrxUSD: t.bigint().notNull().default(0n),
    tBTC: t.bigint().notNull().default(0n),
    WBTC: t.bigint().notNull().default(0n),
  })
);

// Daily USDaf balances in SP
export const SpUsdafBalances = onchainTable("sp_usdaf_balances", (t) => ({
  timestamp: t.bigint().primaryKey(),
  ysyBOLD: t.bigint().notNull(),
  scrvUSD: t.bigint().notNull(),
  sUSDS: t.bigint().notNull(),
  sfrxUSD: t.bigint().notNull(),
  tBTC: t.bigint().notNull(),
  WBTC: t.bigint().notNull(),
}));

// Current user deposits in SP, each column stores the current USDaf amount in the SP as contributed by user
export const CurrentSpDepositorsBalances = onchainTable(
  "current_sp_depositors_balances",
  (t) => ({
    depositor: t.hex().primaryKey(),
    lastUpdated: t.bigint().notNull(), // actual block ts
    ysyBOLD: t.bigint().notNull().default(0n),
    scrvUSD: t.bigint().notNull().default(0n),
    sUSDS: t.bigint().notNull().default(0n),
    sfrxUSD: t.bigint().notNull().default(0n),
    tBTC: t.bigint().notNull().default(0n),
    WBTC: t.bigint().notNull().default(0n),
  })
);

// Current USDaf LP balances for each depositor
export const UsdafLpBalance = onchainTable("usdaf_lp_balance", (t) => ({
  depositor: t.hex().primaryKey(),
  balance: t.bigint().notNull().default(0n),
  yvaultShares: t.bigint().notNull().default(0n),
}));

// Current afCVX LP balances for each depositor
export const AfcvxLpBalance = onchainTable("afcvx_lp_balance", (t) => ({
  depositor: t.hex().primaryKey(),
  balance: t.bigint().notNull().default(0n),
  yvaultShares: t.bigint().notNull().default(0n),
}));

// afCVX holder balance
export const AfcvxBalance = onchainTable("afcvx_balance", (t) => ({
  depositor: t.hex().primaryKey(),
  balance: t.bigint().notNull().default(0n),
}));

// sUSDaf holder balance
export const SusdafBalance = onchainTable("susdaf_balance", (t) => ({
  depositor: t.hex().primaryKey(),
  balance: t.bigint().notNull().default(0n),
}));

// veASF locks
export const VeasfLocks = onchainTable("veasf_locks", (t) => ({
  id: t.text().primaryKey(),
  account: t.hex().notNull(),
  amount: t.bigint().notNull(),
  weeks: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));

export const VeasfLockExtended = onchainTable("veasf_lock_extended", (t) => ({
  id: t.text().primaryKey(),
  account: t.hex().notNull(),
  amount: t.bigint().notNull(),
  weeks: t.bigint().notNull(),
  newWeeks: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));

export const VeasfLocksFrozen = onchainTable("veasf_locks_frozen", (t) => ({
  id: t.text().primaryKey(),
  account: t.hex().notNull(),
  amount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));

export const VeasfLockUnfrozen = onchainTable("veasf_lock_unfrozen", (t) => ({
  id: t.text().primaryKey(),
  account: t.hex().notNull(),
  amount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));

// Defi Stable Avengers Convex vault mapping
export const DsaLpConvexVaultMapping = onchainTable(
  "dsa_lp_convex_vault_mapping",
  (t) => ({
    vault: t.hex().primaryKey(),
    user: t.hex().notNull(),
    transactionHash: t.hex().notNull(), // tx that created the vault
  })
);

export const DsaLpBalance = onchainTable("dsa_lp_balance", (t) => ({
  depositor: t.hex().primaryKey(),
  balance: t.bigint().notNull().default(0n),
}));

export const UsdafPendleLpBalance = onchainTable(
  "usdaf_pendle_lp_balance",
  (t) => ({
    depositor: t.hex().primaryKey(),
    balance: t.bigint().notNull().default(0n),
  })
);

export const SusdafPendleLpBalance = onchainTable(
  "susdaf_pendle_lp_balance",
  (t) => ({
    depositor: t.hex().primaryKey(),
    balance: t.bigint().notNull().default(0n),
  })
);

// Euler Frontier Asym
// balances in eVault shares
export const EulerFrontierBalance = onchainTable(
  "euler_frontier_balance",
  (t) => ({
    depositor: t.hex().primaryKey(),
    usdcShares: t.bigint().notNull().default(0n),
    usdafShares: t.bigint().notNull().default(0n),
    usdtShares: t.bigint().notNull().default(0n),
  })
);

// Redemption
export const Redemption = onchainTable("redemption", (t) => ({
  id: t.text().primaryKey(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  troveManager: t.hex().notNull(),
  attemptedBoldAmount: t.bigint().notNull(),
  debtDecrease: t.bigint().notNull(),
  collDecrease: t.bigint().notNull(),
  price: t.bigint().notNull(),
  redemptionPrice: t.bigint().notNull(),
  entireColl: t.bigint().notNull(),
  entireDebt: t.bigint().notNull(),
}));

// TroveUpdated
export const TroveUpdated = onchainTable("trove_updated", (t) => ({
  id: t.text().primaryKey(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  troveManager: t.hex().notNull(),
  troveId: t.bigint().notNull(),
  debt: t.bigint().notNull(),
  coll: t.bigint().notNull(),
  stake: t.bigint().notNull(),
  annualInterestRate: t.bigint().notNull(),
  entireColl: t.bigint().notNull(),
  entireDebt: t.bigint().notNull(),
  price: t.bigint().notNull(),
}));

// TroveOperation
export const TroveOperation = onchainTable("trove_operation", (t) => ({
  id: t.text().primaryKey(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  troveManager: t.hex().notNull(),
  troveId: t.bigint().notNull(),
  op: t.integer().notNull(),
  annualInterestRate: t.bigint().notNull(),
  debtIncreaseFromRedist: t.bigint().notNull(),
  debtIncreaseFromUpfrontFee: t.bigint().notNull(),
  debtChangeFromOperation: t.bigint().notNull(),
  collIncreaseFromRedist: t.bigint().notNull(),
  collChangeFromOperation: t.bigint().notNull(),
}));

// Current LQTYFORKS LP balances for each depositor
export const LqtyforksLpBalance = onchainTable("lqtyforks_lp_balance", (t) => ({
  depositor: t.hex().primaryKey(),
  balance: t.bigint().notNull().default(0n),
  yvaultShares: t.bigint().notNull().default(0n),
}));
