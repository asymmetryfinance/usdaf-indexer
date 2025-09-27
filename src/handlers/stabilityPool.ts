import { ponder } from "ponder:registry";
import {
  InterestRewards,
  CurrentSpUsdafBalances,
  SpUsdafBalances,
  CurrentSpDepositorsBalances,
} from "ponder:schema";
import { getAddress, zeroAddress } from "viem";
import { spToColumn } from "../mappings";
import { getStartOfDayUTC } from "../utils/dateUtils";

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
