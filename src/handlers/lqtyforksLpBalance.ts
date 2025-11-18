import { ponder } from "ponder:registry";
import { LqtyforksLpBalance } from "ponder:schema";
import { getAddress, zeroAddress } from "viem";

// Lqtyforks Curve Pool events
ponder.on("LqtyforksLp:Transfer", async ({ event, context }) => {
  // if receiveer is not 0x0, we add to their balance
  if (event.args.receiver !== zeroAddress) {
    await context.db
      .insert(LqtyforksLpBalance)
      .values({
        depositor: getAddress(event.args.receiver),
        balance: event.args.value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args.value,
      }));
  }

  // if sender is not 0x0, we subtract from their balance
  if (event.args.sender !== zeroAddress && event.args.value !== 0n) {
    await context.db
      .update(LqtyforksLpBalance, { depositor: getAddress(event.args.sender) })
      .set((row) => ({
        balance: row.balance - event.args.value,
      }));
  }
});

// Stakedao Staking v2
ponder.on("LqtyforksSdGaugeV2:Transfer", async ({ event, context }) => {
  const from = getAddress(event.args.from);
  const to = getAddress(event.args.to);
  const value = event.args.value;

  if (from !== zeroAddress && value !== 0n) {
    await context.db
      .update(LqtyforksLpBalance, {
        depositor: from,
      })
      .set((row) => ({
        balance: row.balance - value,
      }));
  }

  if (to !== zeroAddress) {
    await context.db
      .insert(LqtyforksLpBalance)
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
ponder.on("LqtyforksGauge:Transfer", async ({ event, context }) => {
  if (event.args._from !== zeroAddress && event.args._value !== 0n) {
    await context.db
      .update(LqtyforksLpBalance, {
        depositor: getAddress(event.args._from),
      })
      .set((row) => ({
        balance: row.balance - event.args._value,
      }));
  }

  if (event.args._to !== zeroAddress) {
    await context.db
      .insert(LqtyforksLpBalance)
      .values({
        depositor: getAddress(event.args._to),
        balance: event.args._value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args._value,
      }));
  }
});
