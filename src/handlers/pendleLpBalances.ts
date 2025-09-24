import { ponder } from "ponder:registry";
import { UsdafPendleLpBalance, SusdafPendleLpBalance } from "ponder:schema";
import { getAddress, zeroAddress } from "viem";

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
