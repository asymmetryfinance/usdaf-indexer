import { ponder } from "ponder:registry";
import { UsdafLpBalance } from "ponder:schema";
import { getAddress, zeroAddress } from "viem";

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

  // if sender is not 0x0 and value is not 0, we subtract from their balance
  if (event.args.sender !== zeroAddress && event.args.value !== 0n) {
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
      "0x42c006fE6958a5211513AA61a9b3145E99dDEEFF" &&
    event.args._value !== 0n // staking_token from Stakedao Liquidity Gauge V4
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

  if (from !== zeroAddress && value !== 0n) {
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

// Curve Gauge
ponder.on("ScrvusdUsdafGauge:Transfer", async ({ event, context }) => {
  if (event.args._from !== zeroAddress && event.args._value !== 0n) {
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

  if (sender !== zeroAddress && shares !== 0n) {
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

// SCRVUSD-USDaf Beefy vault
ponder.on("ScrvusdUsdafBeefyVault:Transfer", async ({ event, context }) => {
  const from = getAddress(event.args.from);
  const to = getAddress(event.args.to);
  const shares = event.args.value;

  if (from !== zeroAddress && shares !== 0n) {
    await context.db
      .update(UsdafLpBalance, {
        depositor: from,
      })
      .set((row) => ({
        beefyShares: row.beefyShares - shares,
      }));
  }

  if (to !== zeroAddress) {
    await context.db
      .insert(UsdafLpBalance)
      .values({
        depositor: to,
        beefyShares: shares,
      })
      .onConflictDoUpdate((row) => ({
        beefyShares: row.beefyShares + shares,
      }));
  }
});
