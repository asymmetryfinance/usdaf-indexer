import { ponder } from "ponder:registry";
import { FraxAfLpBalance } from "ponder:schema";
import { getAddress, zeroAddress } from "viem";

// Curve Pool events
ponder.on("FraxAfLp:Transfer", async ({ event, context }) => {
  // if receiveer is not 0x0, we add to their balance
  if (event.args.receiver !== zeroAddress) {
    await context.db
      .insert(FraxAfLpBalance)
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
      .update(FraxAfLpBalance, { depositor: getAddress(event.args.sender) })
      .set((row) => ({
        balance: row.balance - event.args.value,
      }));
  }
});

// Stakedao Staking v2
ponder.on("FraxAfSdGaugeV2:Transfer", async ({ event, context }) => {
  const from = getAddress(event.args.from);
  const to = getAddress(event.args.to);
  const value = event.args.value;

  if (from !== zeroAddress && value !== 0n) {
    await context.db
      .update(FraxAfLpBalance, {
        depositor: from,
      })
      .set((row) => ({
        balance: row.balance - value,
      }));
  }

  if (to !== zeroAddress) {
    await context.db
      .insert(FraxAfLpBalance)
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
ponder.on("FraxAfGauge:Transfer", async ({ event, context }) => {
  if (event.args._from !== zeroAddress && event.args._value !== 0n) {
    await context.db
      .update(FraxAfLpBalance, {
        depositor: getAddress(event.args._from),
      })
      .set((row) => ({
        balance: row.balance - event.args._value,
      }));
  }

  if (event.args._to !== zeroAddress) {
    await context.db
      .insert(FraxAfLpBalance)
      .values({
        depositor: getAddress(event.args._to),
        balance: event.args._value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + event.args._value,
      }));
  }
});
