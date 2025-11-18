import { ponder } from "ponder:registry";
import { AfcvxLpBalance } from "ponder:schema";
import { getAddress, zeroAddress } from "viem";

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
  if (event.args.sender !== zeroAddress && event.args.value !== 0n) {
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
      "0x65f694948f6f59F18CdB503767A504253414EcD1" && // staking_token from Stakedao Liquidity Gauge V4
    event.args._value !== 0n
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

  if (from !== zeroAddress && value !== 0n) {
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
  if (event.args._from !== zeroAddress && event.args._value !== 0n) {
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

  if (sender !== zeroAddress && shares !== 0n) {
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
