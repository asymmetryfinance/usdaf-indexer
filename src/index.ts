import { ponder } from "ponder:registry";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import {
  Prices,
  InterestRewards,
  LiquidationRewards,
  CurrentSpUsdafBalances,
  SpUsdafBalances,
  CurrentSpDepositorsBalances,
  UsdafLpBalance,
  AfcvxLpBalance,
  AfcvxBalance,
  SusdafBalance,
  VeasfLocks,
  DsaLpConvexVaultMapping,
  DsaLpBalance,
  UsdafPendleLpBalance,
  SusdafPendleLpBalance,
  VeasfLockExtended,
  VeasfLocksFrozen,
  VeasfLockUnfrozen,
} from "ponder:schema";
import { getAddress, erc4626Abi, zeroAddress } from "viem";

// mapping: StabilityPool to column names
const spToColumn = {
  "0x83e5BDe77d7477eCd972E338541b90Af57675536": "ysyBOLD",
  "0xd48dC7cDdc481F596BD9A97755c7Ac696aD4eA87": "scrvUSD",
  "0xb571781CEdf07257d60d6b252a3D8b24150Ded97": "sUSDS",
  "0x446F358e3a927cc68F342141d78Aa2d1C54e18F0": "sfrxUSD",
  "0x545a7dDFd863bd7EA0BFc689125169598085f75e": "tBTC",
  "0x922faA141e95e43A9deEab8DaDe3Ac8d4a32AD5c": "WBTC",
} as const;

// mapping: TroveManager to column names
const tmToColumn = {
  "0xF8a25a2E4c863bb7CEa7e4B4eeb3866BB7f11718": "ysyBOLD",
  "0x7aFf0173e3D7C5416D8cAa3433871Ef07568220d": "scrvUSD",
  "0x53ce82AC43660AaB1F80FEcd1D74Afe7a033D505": "sUSDS",
  "0x478E7c27193Aca052964C3306D193446027630b0": "sfrxUSD",
  "0xfb17d0402ae557e3Efa549812b95e931B2B63bCE": "tBTC",
  "0x7bd47Eca45ee18609D3D64Ba683Ce488ca9320A3": "WBTC",
} as const;

// utility: converts block ts to UTC 0000 of the day
function getStartOfDayUTC(unixTimestamp: number) {
  const date = new Date(unixTimestamp * 1000);
  return (
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
    1000
  );
}

// Fetch collateral prices once per day
// every 7200 blocks since USDaf v2 deployment -- see ponder.config
// prices from Defillama API, except ysyBOLD price read from contract
ponder.on("PricesUpdate:block", async ({ event, context }) => {
  const timestamp = getStartOfDayUTC(Number(event.block.timestamp));

  // fetch ysyBOLD price from contract
  const ysyBoldPrice = await context.client.readContract({
    abi: erc4626Abi,
    address: "0x23346B04a7f55b8760E5860AA5A77383D63491cD", // ysyBOLD 4626 contract
    functionName: "convertToAssets",
    args: [BigInt(1e18)],
  });

  // Coingecko coin ids
  // @dev Defillama API docs https://api-docs.defillama.com/#tag/coins/get/batchHistorical
  const coins = [
    "staked-frax-usd",
    "savings-crvusd",
    "susds",
    "tbtc",
    "wrapped-bitcoin",
  ];

  const queryCoins: Record<string, [number, number]> = {};
  for (const c of coins) {
    queryCoins[`coingecko:${c}`] = [timestamp - 86400, timestamp];
  }

  try {
    const response = await axios.get("https://coins.llama.fi/batchHistorical", {
      params: {
        coins: JSON.stringify(queryCoins),
      },
    });

    // Extract max price for each coin symbol
    const coinPrices = response.data.coins;
    // Map: schema column -> defillama symbol
    const symbolToColumn = {
      sfrxusd: "sfrxUSD",
      scrvusd: "scrvUSD",
      susds: "sUSDS",
      tbtc: "tBTC",
      wbtc: "WBTC",
    } as const;
    const priceInsert: Record<string, number> = {};
    for (const [key, valueRaw] of Object.entries(coinPrices)) {
      const value = valueRaw as any;
      const symbol = value.symbol?.toLowerCase();
      const column = symbolToColumn[symbol as keyof typeof symbolToColumn];
      if (!column) continue;
      // Find max price in the prices array
      const maxPrice = Array.isArray(value.prices)
        ? value.prices.reduce(
            (max: number, p: any) => (p.price > max ? p.price : max),
            -Infinity
          )
        : 0;
      priceInsert[column] = maxPrice;
    }

    await context.db.insert(Prices).values({
      timestamp: BigInt(timestamp),
      ysyBOLD: Number(ysyBoldPrice) / 1e18,
      scrvUSD: priceInsert.scrvUSD ?? 0,
      sUSDS: priceInsert.sUSDS ?? 0,
      sfrxUSD: priceInsert.sfrxUSD ?? 0,
      tBTC: priceInsert.tBTC ?? 0,
      WBTC: priceInsert.WBTC ?? 0,
    });
  } catch (error) {
    console.error("Error fetching batchHistorical from Defillama:", error);
  }
});

// USDaf Transfer events
// Tracks interest minted to SP and SP balances delta
ponder.on("USDaf:Transfer", async ({ event, context }) => {
  const timestamp = getStartOfDayUTC(Number(event.block.timestamp));
  const from = getAddress(event.args.from);
  const to = getAddress(event.args.to);

  // case if interest minted to SP
  if (
    from === zeroAddress &&
    Object.prototype.hasOwnProperty.call(spToColumn, to)
  ) {
    const column = spToColumn[to as keyof typeof spToColumn];
    // Insert or update the correct column in InterestRewards
    await context.db
      .insert(InterestRewards)
      .values({
        timestamp: BigInt(timestamp),
        [column]: event.args.value,
      })
      .onConflictDoUpdate((row) => ({
        // Add the new value to the existing value for the correct column
        [column]: row[column] + event.args.value,
      }));
  }

  // case if USDaf trasnferred to SP
  if (Object.prototype.hasOwnProperty.call(spToColumn, to)) {
    const column = spToColumn[to as keyof typeof spToColumn];
    // first we add to the running balances of SP
    const currentSpUsdafBalances = await context.db
      .insert(CurrentSpUsdafBalances)
      .values({
        id: zeroAddress,
        lastUpdated: event.block.timestamp, // actual block ts
        [column]: event.args.value,
      }) // the insert operation should only get hit once because we only have 1 row in this table
      .onConflictDoUpdate((row) => ({
        lastUpdated: event.block.timestamp,
        // Add the new value to the existing value for the correct column
        [column]: row[column] + event.args.value,
      }));
    // then we modify the daily balances table
    await context.db
      .insert(SpUsdafBalances)
      .values({
        timestamp: BigInt(timestamp),
        ysyBOLD: currentSpUsdafBalances.ysyBOLD,
        scrvUSD: currentSpUsdafBalances.scrvUSD,
        sUSDS: currentSpUsdafBalances.sUSDS,
        sfrxUSD: currentSpUsdafBalances.sfrxUSD,
        tBTC: currentSpUsdafBalances.tBTC,
        WBTC: currentSpUsdafBalances.WBTC,
      }) // if row does not exist for this day, create it
      .onConflictDoUpdate({
        ysyBOLD: currentSpUsdafBalances.ysyBOLD,
        scrvUSD: currentSpUsdafBalances.scrvUSD,
        sUSDS: currentSpUsdafBalances.sUSDS,
        sfrxUSD: currentSpUsdafBalances.sfrxUSD,
        tBTC: currentSpUsdafBalances.tBTC,
        WBTC: currentSpUsdafBalances.WBTC,
      }); // if row exists, update with latest balances
  }

  // case if USDaf transferred from SP
  if (Object.prototype.hasOwnProperty.call(spToColumn, from)) {
    const column = spToColumn[to as keyof typeof spToColumn];
    // first we subtract from the running balances of SP
    const currentSpUsdafBalances = await context.db
      .update(CurrentSpUsdafBalances, { id: zeroAddress })
      .set((row) => ({
        lastUpdated: event.block.timestamp,
        // Subtract the new value from the existing value for the correct column
        [column]: ((row as any)[column] ?? 0n) - event.args.value,
      }));
    // then we modify the daily balances table
    await context.db
      .insert(SpUsdafBalances)
      .values({
        timestamp: BigInt(timestamp),
        ysyBOLD: currentSpUsdafBalances.ysyBOLD,
        scrvUSD: currentSpUsdafBalances.scrvUSD,
        sUSDS: currentSpUsdafBalances.sUSDS,
        sfrxUSD: currentSpUsdafBalances.sfrxUSD,
        tBTC: currentSpUsdafBalances.tBTC,
        WBTC: currentSpUsdafBalances.WBTC,
      })
      .onConflictDoUpdate({
        ysyBOLD: currentSpUsdafBalances.ysyBOLD,
        scrvUSD: currentSpUsdafBalances.scrvUSD,
        sUSDS: currentSpUsdafBalances.sUSDS,
        sfrxUSD: currentSpUsdafBalances.sfrxUSD,
        tBTC: currentSpUsdafBalances.tBTC,
        WBTC: currentSpUsdafBalances.WBTC,
      });
  }
});

// TroveManager Liquidation events
// Tracks collateral sent to SP on liquidation
ponder.on("TroveManager:Liquidation", async ({ event, context }) => {
  const timestamp = getStartOfDayUTC(Number(event.block.timestamp));
  const troveManager = getAddress(event.log.address);
  const collSentToSp = event.args._collSentToSP;

  const column = tmToColumn[troveManager as keyof typeof tmToColumn];
  // Insert or update the correct column in LiquidationRewards
  await context.db
    .insert(LiquidationRewards)
    .values({
      timestamp: BigInt(timestamp),
      [column]: collSentToSp,
    })
    .onConflictDoUpdate((row) => ({
      // Add the new value to the existing value for the correct column
      [column]: row[column] + collSentToSp,
    }));
});

// SP Deposit/Withdraw events
// Tracks user contributions
ponder.on("StabilityPool:DepositOperation", async ({ event, context }) => {
  const sp = getAddress(event.log.address);
  const column = spToColumn[sp as keyof typeof spToColumn];

  await context.db
    .insert(CurrentSpDepositorsBalances)
    .values({
      depositor: getAddress(event.args._depositor),
      lastUpdated: event.block.timestamp,
      [column]: event.args._topUpOrWithdrawal,
    })
    .onConflictDoUpdate((row) => ({
      lastUpdated: event.block.timestamp,
      [column]:
        row[column] + event.args._topUpOrWithdrawal < 0n // negative if withdrawing deposits + compounded yield
          ? 0n
          : row[column] + event.args._topUpOrWithdrawal,
    }));
});

// USDaf LP events

// SCRVUSD-USDaf Curve Pool events
ponder.on("ScrvusdUsdafLp:Transfer", async ({ event, context }) => {
  // if receiveer is not 0x0, we add to their balance
  if (event.args.receiver !== zeroAddress) {
    await context.db
      .insert(UsdafLpBalance)
      .values({
        depositor: getAddress(event.args.receiver),
        balance: event.args.value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args.value,
      }));
  }

  // if sender is not 0x0, we subtract from their balance
  if (event.args.sender !== zeroAddress) {
    await context.db
      .update(UsdafLpBalance, { depositor: getAddress(event.args.sender) })
      .set((row) => ({
        balance: row.balance - event.args.value,
      }));
  }
});

// Stakedao
ponder.on("ScrvusdUsdafSdGauge:Transfer", async ({ event, context }) => {
  if (
    event.args._from !== zeroAddress &&
    getAddress(event.args._from) !==
      "0x42c006fE6958a5211513AA61a9b3145E99dDEEFF" // staking_token from Stakedao Liquidity Gauge V4
  ) {
    await context.db
      .update(UsdafLpBalance, {
        depositor: getAddress(event.args._from),
      })
      .set((row) => ({
        balance: row.balance - event.args._value,
      }));
  }

  if (event.args._to !== zeroAddress) {
    await context.db
      .insert(UsdafLpBalance)
      .values({
        depositor: getAddress(event.args._to),
        balance: event.args._value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args._value,
      }));
  }
});

ponder.on("ScrvusdUsdafSdGauge:Withdraw", async ({ event, context }) => {
  const depositorAddress = getAddress(event.args.provider);
  await context.db
    .update(UsdafLpBalance, { depositor: depositorAddress })
    .set((row) => ({
      balance: row.balance - event.args.value,
    }));
});

// Stakedao Staking v2
ponder.on("ScrvusdUsdafSdGaugeV2:Transfer", async ({ event, context }) => {
  const from = getAddress(event.args.from);
  const to = getAddress(event.args.to);
  const value = event.args.value;

  if (from !== zeroAddress) {
    await context.db
      .update(UsdafLpBalance, {
        depositor: from,
      })
      .set((row) => ({
        balance: row.balance - value,
      }));
  }

  if (to !== zeroAddress) {
    await context.db
      .insert(UsdafLpBalance)
      .values({
        depositor: to,
        balance: value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + value,
      }));
  }
});

// Convex
ponder.on("ConvexBooster:Deposited", async ({ event, context }) => {
  const depositorAddress = getAddress(event.args.user);

  // pid 484 = SCRVUSD-USDaf pool
  if (event.args.poolid === BigInt(484)) {
    await context.db
      .insert(UsdafLpBalance)
      .values({
        depositor: depositorAddress,
        balance: event.args.amount,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args.amount,
      }));
  }

  // pid 383 = CVX-afCVX pool
  if (event.args.poolid === BigInt(383)) {
    await context.db
      .insert(AfcvxLpBalance)
      .values({
        depositor: depositorAddress,
        balance: event.args.amount,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args.amount,
      }));
  }
});

ponder.on("ConvexBooster:Withdrawn", async ({ event, context }) => {
  const depositorAddress = getAddress(event.args.user);

  if (event.args.poolid === BigInt(484)) {
    await context.db
      .update(UsdafLpBalance, { depositor: depositorAddress })
      .set((row) => ({
        balance: row.balance - event.args.amount,
      }));
  }

  if (event.args.poolid === BigInt(383)) {
    await context.db
      .update(AfcvxLpBalance, { depositor: depositorAddress })
      .set((row) => ({
        balance: row.balance - event.args.amount,
      }));
  }
});

// Curve Gauge
ponder.on("ScrvusdUsdafGauge:Transfer", async ({ event, context }) => {
  if (event.args._from !== zeroAddress) {
    await context.db
      .update(UsdafLpBalance, {
        depositor: getAddress(event.args._from),
      })
      .set((row) => ({
        balance: row.balance - event.args._value,
      }));
  }

  if (event.args._to !== zeroAddress) {
    await context.db
      .insert(UsdafLpBalance)
      .values({
        depositor: getAddress(event.args._to),
        balance: event.args._value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args._value,
      }));
  }
});

// SCRVUSD-USDaf Yearn vault
ponder.on("ScrvusdUsdafYvault:Transfer", async ({ event, context }) => {
  const sender = getAddress(event.args.sender);
  const receiver = getAddress(event.args.receiver);
  const shares = event.args.value;

  if (sender !== zeroAddress) {
    await context.db
      .update(UsdafLpBalance, {
        depositor: sender,
      })
      .set((row) => ({
        yvaultShares: row.yvaultShares - shares,
      }));
  }

  if (receiver !== zeroAddress) {
    await context.db
      .insert(UsdafLpBalance)
      .values({
        depositor: receiver,
        yvaultShares: shares,
      })
      .onConflictDoUpdate((row) => ({
        yvaultShares: row.yvaultShares + shares,
      }));
  }
});

// afCVX

// naked afCVX balance
ponder.on("Afcvx:Transfer", async ({ event, context }) => {
  const from = getAddress(event.args.from);
  const to = getAddress(event.args.to);
  const value = event.args.value;

  if (from !== zeroAddress) {
    await context.db.update(AfcvxBalance, { depositor: from }).set((row) => ({
      balance: row.balance - value,
    }));
  }

  if (to !== zeroAddress) {
    await context.db
      .insert(AfcvxBalance)
      .values({
        depositor: to,
        balance: value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + value,
      }));
  }
});

// afCVX Curve LP
ponder.on("CvxAfcvxLp:Transfer", async ({ event, context }) => {
  // if receiveer is not 0x0, we add to their balance
  if (event.args.receiver !== zeroAddress) {
    await context.db
      .insert(AfcvxLpBalance)
      .values({
        depositor: getAddress(event.args.receiver),
        balance: event.args.value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args.value,
      }));
  }

  // if sender is not 0x0, we subtract from their balance
  if (event.args.sender !== zeroAddress) {
    await context.db
      .update(AfcvxLpBalance, { depositor: getAddress(event.args.sender) })
      .set((row) => ({
        balance: row.balance - event.args.value,
      }));
  }
});

// Stakedao
ponder.on("CvxAfcvxSdGauge:Transfer", async ({ event, context }) => {
  if (
    event.args._from !== zeroAddress &&
    getAddress(event.args._from) !==
      "0x65f694948f6f59F18CdB503767A504253414EcD1" // staking_token from Stakedao Liquidity Gauge V4
  ) {
    await context.db
      .update(AfcvxLpBalance, {
        depositor: getAddress(event.args._from),
      })
      .set((row) => ({
        balance: row.balance - event.args._value,
      }));
  }

  if (event.args._to !== zeroAddress) {
    await context.db
      .insert(AfcvxLpBalance)
      .values({
        depositor: getAddress(event.args._to),
        balance: event.args._value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args._value,
      }));
  }
});

ponder.on("CvxAfcvxSdGauge:Withdraw", async ({ event, context }) => {
  const depositorAddress = getAddress(event.args.provider);
  await context.db
    .update(AfcvxLpBalance, { depositor: depositorAddress })
    .set((row) => ({
      balance: row.balance - event.args.value,
    }));
});

ponder.on("CvxAfcvxSdGaugeV2:Transfer", async ({ event, context }) => {
  const from = getAddress(event.args.from);
  const to = getAddress(event.args.to);
  const value = event.args.value;

  if (from !== zeroAddress) {
    await context.db
      .update(AfcvxLpBalance, {
        depositor: from,
      })
      .set((row) => ({
        balance: row.balance - value,
      }));
  }

  if (to !== zeroAddress) {
    await context.db
      .insert(AfcvxLpBalance)
      .values({
        depositor: to,
        balance: value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + value,
      }));
  }
});

// Curve Gauge
ponder.on("CvxAfcvxGauge:Transfer", async ({ event, context }) => {
  if (event.args._from !== zeroAddress) {
    await context.db
      .update(AfcvxLpBalance, {
        depositor: getAddress(event.args._from),
      })
      .set((row) => ({
        balance: row.balance - event.args._value,
      }));
  }

  if (event.args._to !== zeroAddress) {
    await context.db
      .insert(AfcvxLpBalance)
      .values({
        depositor: getAddress(event.args._to),
        balance: event.args._value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args._value,
      }));
  }
});

// CVX-afCVX Yearn vault
ponder.on("CvxAfcvxYvault:Transfer", async ({ event, context }) => {
  const sender = getAddress(event.args.sender);
  const receiver = getAddress(event.args.receiver);
  const shares = event.args.value;

  if (sender !== zeroAddress) {
    await context.db
      .update(AfcvxLpBalance, {
        depositor: sender,
      })
      .set((row) => ({
        yvaultShares: row.yvaultShares - shares,
      }));
  }

  if (receiver !== zeroAddress) {
    await context.db
      .insert(AfcvxLpBalance)
      .values({
        depositor: receiver,
        yvaultShares: shares,
      })
      .onConflictDoUpdate((row) => ({
        yvaultShares: row.yvaultShares + shares,
      }));
  }
});

// sUSDaf
ponder.on("Susdaf:Transfer", async ({ event, context }) => {
  const sender = getAddress(event.args.sender);
  const receiver = getAddress(event.args.receiver);
  const shares = event.args.value;

  if (sender !== zeroAddress) {
    await context.db
      .update(SusdafBalance, { depositor: sender })
      .set((row) => ({
        balance: row.balance - shares,
      }));
  }

  if (receiver !== zeroAddress) {
    await context.db
      .insert(SusdafBalance)
      .values({
        depositor: receiver,
        balance: shares,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + shares,
      }));
  }
});

// veASF locks
ponder.on("Veasf:LockCreated", async ({ event, context }) => {
  const account = event.args.account;
  const amount = event.args.amount;
  const weeks = event.args._weeks;
  const timestamp = event.block.timestamp;

  await context.db.insert(VeasfLocks).values({
    id: uuidv4(),
    account: account,
    amount: amount,
    weeks: weeks,
    timestamp: timestamp,
    transactionHash: event.transaction.hash,
  });
});

ponder.on("Veasf:LocksCreated", async ({ event, context }) => {
  const account = event.args.account;
  const newLocks = event.args.newLocks;
  const timestamp = event.block.timestamp;

  for (const lock of newLocks) {
    await context.db.insert(VeasfLocks).values({
      id: uuidv4(),
      account: account,
      amount: lock.amount,
      weeks: lock.weeksToUnlock,
      timestamp: timestamp,
      transactionHash: event.transaction.hash,
    });
  }
});

ponder.on("Veasf:LockExtended", async ({ event, context }) => {
  const account = event.args.account;
  const amount = event.args.amount;
  const weeks = event.args._weeks;
  const newWeeks = event.args.newWeeks;
  const timestamp = event.block.timestamp;

  await context.db.insert(VeasfLockExtended).values({
    id: uuidv4(),
    account: account,
    amount: amount,
    weeks: weeks,
    newWeeks: newWeeks,
    timestamp: timestamp,
    transactionHash: event.transaction.hash,
  });
});

ponder.on("Veasf:LocksExtended", async ({ event, context }) => {
  const account = event.args.account;
  const locks = event.args.locks;
  const timestamp = event.block.timestamp;

  for (const lock of locks) {
    await context.db.insert(VeasfLockExtended).values({
      id: uuidv4(),
      account: account,
      amount: lock.amount,
      weeks: lock.currentWeeks,
      newWeeks: lock.newWeeks,
      timestamp: timestamp,
      transactionHash: event.transaction.hash,
    });
  }
});

ponder.on("Veasf:LocksFrozen", async ({ event, context }) => {
  const account = event.args.account;
  const amount = event.args.amount;
  const timestamp = event.block.timestamp;

  await context.db.insert(VeasfLocksFrozen).values({
    id: uuidv4(),
    account: account,
    amount: amount,
    timestamp: timestamp,
    transactionHash: event.transaction.hash,
  });
});

ponder.on("Veasf:LocksUnfrozen", async ({ event, context }) => {
  const account = event.args.account;
  const amount = event.args.amount;
  const timestamp = event.block.timestamp;

  await context.db.insert(VeasfLockUnfrozen).values({
    id: uuidv4(),
    account: account,
    amount: amount,
    timestamp: timestamp,
    transactionHash: event.transaction.hash,
  });
});

// Defi Stable Avengers LP events

// DSA Curve Pool events
ponder.on("DsaLp:Transfer", async ({ event, context }) => {
  // if receiveer is not 0x0, we add to their balance
  if (event.args.receiver !== zeroAddress) {
    await context.db
      .insert(DsaLpBalance)
      .values({
        depositor: getAddress(event.args.receiver),
        balance: event.args.value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args.value,
      }));
  }

  // if sender is not 0x0, we subtract from their balance
  if (event.args.sender !== zeroAddress) {
    await context.db
      .update(DsaLpBalance, { depositor: getAddress(event.args.sender) })
      .set((row) => ({
        balance: row.balance - event.args.value,
      }));
  }
});

ponder.on("ConvexFxnPoolRegistry:AddUserVault", async ({ event, context }) => {
  const dsaPoolId = BigInt(42);
  if (event.args.poolid === dsaPoolId) {
    const vault = await context.client.readContract({
      abi: context.contracts.ConvexFxnPoolRegistry.abi,
      address: event.log.address,
      functionName: "vaultMap",
      args: [dsaPoolId, event.args.user],
    });

    await context.db.insert(DsaLpConvexVaultMapping).values({
      vault: getAddress(vault as string),
      user: getAddress(event.args.user),
      transactionHash: event.transaction.hash,
    });
  }
});

ponder.on("DsaFxnGauge:Transfer", async ({ event, context }) => {
  // if receiveer is not 0x0, we add to their balance
  if (event.args.to !== zeroAddress) {
    const to = getAddress(event.args.to);
    const convexVault = await context.db.find(DsaLpConvexVaultMapping, {
      vault: to,
    });
    const depositor = convexVault ? convexVault.user : to;
    await context.db
      .insert(DsaLpBalance)
      .values({
        depositor: depositor,
        balance: event.args.value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args.value,
      }));
  }

  // if sender is not 0x0, we subtract from their balance
  if (event.args.from !== zeroAddress) {
    const from = getAddress(event.args.from);
    const convexVault = await context.db.find(DsaLpConvexVaultMapping, {
      vault: from,
    });
    const depositor = convexVault ? convexVault.user : from;
    await context.db
      .update(DsaLpBalance, { depositor: depositor })
      .set((row) => ({
        balance: row.balance - event.args.value,
      }));
  }
});

ponder.on("DsaLpGauge:Transfer", async ({ event, context }) => {
  if (event.args._from !== zeroAddress) {
    await context.db
      .update(DsaLpBalance, {
        depositor: getAddress(event.args._from),
      })
      .set((row) => ({
        balance: row.balance - event.args._value,
      }));
  }

  if (event.args._to !== zeroAddress) {
    await context.db
      .insert(DsaLpBalance)
      .values({
        depositor: getAddress(event.args._to),
        balance: event.args._value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args._value,
      }));
  }
});

// Pendle LP
// Usdaf Pendle LP
ponder.on("UsdafPendleLp:Transfer", async ({ event, context }) => {
  if (event.args.from !== zeroAddress) {
    await context.db
      .update(UsdafPendleLpBalance, {
        depositor: getAddress(event.args.from),
      })
      .set((row) => ({
        balance: row.balance - event.args.value,
      }));
  }

  if (event.args.to !== zeroAddress) {
    await context.db
      .insert(UsdafPendleLpBalance)
      .values({
        depositor: getAddress(event.args.to),
        balance: event.args.value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args.value,
      }));
  }
});

// Usdaf Penpie
ponder.on("UsdafPenpieReceipt:Transfer", async ({ event, context }) => {
  if (event.args.from !== zeroAddress) {
    await context.db
      .update(UsdafPendleLpBalance, {
        depositor: getAddress(event.args.from),
      })
      .set((row) => ({
        balance: row.balance - event.args.value,
      }));
  }

  if (event.args.to !== zeroAddress) {
    await context.db
      .insert(UsdafPendleLpBalance)
      .values({
        depositor: getAddress(event.args.to),
        balance: event.args.value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args.value,
      }));
  }
});

// Susdaf Pendle LP
ponder.on("SusdafPendleLp:Transfer", async ({ event, context }) => {
  if (event.args.from !== zeroAddress) {
    await context.db
      .update(SusdafPendleLpBalance, {
        depositor: getAddress(event.args.from),
      })
      .set((row) => ({
        balance: row.balance - event.args.value,
      }));
  }

  if (event.args.to !== zeroAddress) {
    await context.db
      .insert(SusdafPendleLpBalance)
      .values({
        depositor: getAddress(event.args.to),
        balance: event.args.value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args.value,
      }));
  }
});

// Susdaf Penpie
ponder.on("SusdafPenpieReceipt:Transfer", async ({ event, context }) => {
  if (event.args.from !== zeroAddress) {
    await context.db
      .update(SusdafPendleLpBalance, {
        depositor: getAddress(event.args.from),
      })
      .set((row) => ({
        balance: row.balance - event.args.value,
      }));
  }

  if (event.args.to !== zeroAddress) {
    await context.db
      .insert(SusdafPendleLpBalance)
      .values({
        depositor: getAddress(event.args.to),
        balance: event.args.value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args.value,
      }));
  }
});

// Eqb Pendle Booster
ponder.on("EqbPendleBooster:Deposited", async ({ event, context }) => {
  const poolId = event.args._poolid;
  const depositor = getAddress(event.args._user);

  // Usdaf pool
  if (poolId === BigInt(281)) {
    await context.db
      .insert(UsdafPendleLpBalance)
      .values({
        depositor: depositor,
        balance: event.args._amount,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args._amount,
      }));
  }

  // sUSDaf pool
  if (poolId === BigInt(282)) {
    await context.db
      .insert(SusdafPendleLpBalance)
      .values({
        depositor: depositor,
        balance: event.args._amount,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args._amount,
      }));
  }
});

ponder.on("EqbPendleBooster:Withdrawn", async ({ event, context }) => {
  const poolId = event.args._poolid;
  const depositor = getAddress(event.args._user);

  // Usdaf pool
  if (poolId === BigInt(281)) {
    await context.db
      .update(UsdafPendleLpBalance, { depositor: depositor })
      .set((row) => ({
        balance: row.balance - event.args._amount,
      }));
  }

  // sUSDaf pool
  if (poolId === BigInt(282)) {
    await context.db
      .update(SusdafPendleLpBalance, { depositor: depositor })
      .set((row) => ({
        balance: row.balance - event.args._amount,
      }));
  }
});

// Stakedao Pendle
// USDaf
ponder.on("UsdafPendleSdGauge:Transfer", async ({ event, context }) => {
  if (
    event.args._from !== zeroAddress &&
    getAddress(event.args._from) !==
      "0xf67CC715c927b36c95D86Aa93FeB8b989Dc9154A" // staking_token from Stakedao Liquidity Gauge V4
  ) {
    await context.db
      .update(UsdafPendleLpBalance, {
        depositor: getAddress(event.args._from),
      })
      .set((row) => ({
        balance: row.balance - event.args._value,
      }));
  }

  if (event.args._to !== zeroAddress) {
    await context.db
      .insert(UsdafPendleLpBalance)
      .values({
        depositor: getAddress(event.args._to),
        balance: event.args._value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args._value,
      }));
  }
});

ponder.on("UsdafPendleSdGauge:Withdraw", async ({ event, context }) => {
  const depositorAddress = getAddress(event.args.provider);
  await context.db
    .update(UsdafPendleLpBalance, { depositor: depositorAddress })
    .set((row) => ({
      balance: row.balance - event.args.value,
    }));
});

// Stakedao Pendle
// sUSDaf
ponder.on("SusdafPendleSdGauge:Transfer", async ({ event, context }) => {
  if (
    event.args._from !== zeroAddress &&
    getAddress(event.args._from) !==
      "0xfc37c789f3B72170c6f89d55A461B75DC802731E" // staking_token from Stakedao Liquidity Gauge V4
  ) {
    await context.db
      .update(SusdafPendleLpBalance, {
        depositor: getAddress(event.args._from),
      })
      .set((row) => ({
        balance: row.balance - event.args._value,
      }));
  }

  if (event.args._to !== zeroAddress) {
    await context.db
      .insert(SusdafPendleLpBalance)
      .values({
        depositor: getAddress(event.args._to),
        balance: event.args._value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args._value,
      }));
  }
});

ponder.on("SusdafPendleSdGauge:Withdraw", async ({ event, context }) => {
  const depositorAddress = getAddress(event.args.provider);
  await context.db
    .update(SusdafPendleLpBalance, { depositor: depositorAddress })
    .set((row) => ({
      balance: row.balance - event.args.value,
    }));
});
