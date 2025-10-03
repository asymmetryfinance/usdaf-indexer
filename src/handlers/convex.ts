import { ponder } from "ponder:registry";
import {
  UsdafLpBalance,
  AfcvxLpBalance,
  LqtyforksLpBalance,
} from "ponder:schema";
import { getAddress } from "viem";

// Convex Booster events
// Handles deposits and withdrawals for multiple pools
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

  // pid 500 = LQTYFORKS pool
  if (event.args.poolid === BigInt(500)) {
    await context.db
      .insert(LqtyforksLpBalance)
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

  // pid 484 = SCRVUSD-USDaf pool
  if (event.args.poolid === BigInt(484)) {
    await context.db
      .update(UsdafLpBalance, { depositor: depositorAddress })
      .set((row) => ({
        balance: row.balance - event.args.amount,
      }));
  }

  // pid 383 = CVX-afCVX pool
  if (event.args.poolid === BigInt(383)) {
    await context.db
      .update(AfcvxLpBalance, { depositor: depositorAddress })
      .set((row) => ({
        balance: row.balance - event.args.amount,
      }));
  }

  // pid 500 = LQTYFORKS pool
  if (event.args.poolid === BigInt(500)) {
    await context.db
      .update(LqtyforksLpBalance, { depositor: depositorAddress })
      .set((row) => ({
        balance: row.balance - event.args.amount,
      }));
  }
});
