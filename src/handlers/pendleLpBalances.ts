import { ponder } from "ponder:registry";
import { PendleLpBalance, PendleBooster } from "ponder:schema";
import { markets } from "../pendleMarkets";
import { getAddress, zeroAddress } from "viem";
import { eq } from "drizzle-orm";

// Pendle LP
ponder.on("PendleLp:Transfer", async ({ event, context }) => {
  const market = event.log.address;
  const from = event.args.from;
  const to = event.args.to;
  const value = event.args.value;

  if (from !== zeroAddress && value !== 0n) {
    await context.db
      .update(PendleLpBalance, {
        id: `${market}-${from}`,
      })
      .set((row) => ({
        balance: row.balance - value,
      }));
  }

  if (to !== zeroAddress) {
    await context.db
      .insert(PendleLpBalance)
      .values({
        id: `${market}-${to}`,
        balance: value,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + value,
      }));
  }
});

// Penpie new pool indexing
ponder.on("PenpieStaking:PoolAdded", async ({ event, context }) => {
  const market = event.args._market;
  if (markets.includes(getAddress(market))) {
    await context.db
      .insert(PendleBooster)
      .values({
        market: market,
        penpieReceiptToken: event.args._receiptToken,
      })
      .onConflictDoUpdate({ penpieReceiptToken: event.args._receiptToken });
  }
});

// Penpie receipt token transfer
ponder.on("PenpieReceipt:Transfer", async ({ event, context }) => {
  const receiptToken = event.log.address;

  // Check if this receipt token is for one of our Pendle markets
  const boosterRecord = await context.db.sql.query.PendleBooster.findFirst({
    where: eq(PendleBooster.penpieReceiptToken, receiptToken),
  });

  if (boosterRecord) {
    const market = boosterRecord.market;
    const from = event.args.from;
    const to = event.args.to;
    const value = event.args.value;

    if (from !== zeroAddress && value !== 0n) {
      await context.db
        .update(PendleLpBalance, {
          id: `${market}-${from}`,
        })
        .set((row) => ({
          balance: row.balance - value,
        }));
    }

    if (to !== zeroAddress) {
      await context.db
        .insert(PendleLpBalance)
        .values({
          id: `${market}-${to}`,
          balance: value,
        })
        .onConflictDoUpdate((row) => ({
          balance: row.balance + value,
        }));
    }
  }
});

// Stakedao new pool indexing
ponder.on("SdPendleVaultFactory:VaultDeployed", async ({ event, context }) => {
  const market = event.args.lptToken;
  if (markets.includes(getAddress(market))) {
    await context.db
      .insert(PendleBooster)
      .values({
        market: market,
        stakedaoStakingToken: event.args.proxy,
      })
      .onConflictDoUpdate({
        stakedaoStakingToken: event.args.proxy,
      });
  }
});

ponder.on("SdPendleVaultFactory:GaugeDeployed", async ({ event, context }) => {
  const stakeToken = event.args.stakeToken;
  const boosterRecord = await context.db.sql.query.PendleBooster.findFirst({
    where: eq(PendleBooster.stakedaoStakingToken, stakeToken),
  });
  if (boosterRecord) {
    await context.db
      .update(PendleBooster, {
        market: boosterRecord.market,
      })
      .set({ stakedaoGauge: event.args.proxy });
  }
});

ponder.on("SdPendleGauge:Transfer", async ({ event, context }) => {
  const gauge = event.log.address;

  // Check if this gauge is for one of our Pendle markets
  const boosterRecord = await context.db.sql.query.PendleBooster.findFirst({
    where: eq(PendleBooster.stakedaoGauge, gauge),
  });

  if (boosterRecord) {
    const market = boosterRecord.market;
    const stakeToken = boosterRecord.stakedaoStakingToken;
    const from = event.args._from;
    const to = event.args._to;
    const value = event.args._value;

    if (from !== zeroAddress && from !== stakeToken && value !== 0n) {
      await context.db
        .update(PendleLpBalance, {
          id: `${market}-${from}`,
        })
        .set((row) => ({
          balance: row.balance - value,
        }));
    }

    if (to !== zeroAddress) {
      await context.db
        .insert(PendleLpBalance)
        .values({
          id: `${market}-${to}`,
          balance: value,
        })
        .onConflictDoUpdate((row) => ({
          balance: row.balance + value,
        }));
    }
  }
});

ponder.on("SdPendleGauge:Withdraw", async ({ event, context }) => {
  const gauge = event.log.address;

  // Check if this gauge is for one of our Pendle markets
  const boosterRecord = await context.db.sql.query.PendleBooster.findFirst({
    where: eq(PendleBooster.stakedaoGauge, gauge),
  });

  if (boosterRecord) {
    const market = boosterRecord.market;
    const depositor = event.args.provider;
    const value = event.args.value;

    await context.db
      .update(PendleLpBalance, {
        id: `${market}-${depositor}`,
      })
      .set((row) => ({
        balance: row.balance - value,
      }));
  }
});

// Equilibria new pool indexing
ponder.on("EqbPendleBooster:PoolAdded", async ({ event, context }) => {
  const market = event.args._market;
  if (markets.includes(getAddress(market))) {
    await context.db
      .insert(PendleBooster)
      .values({
        market: market,
        eqbPoolId: event.args._pid,
      })
      .onConflictDoUpdate({ eqbPoolId: event.args._pid });
  }
});

// Eqb Pendle Booster
ponder.on("EqbPendleBooster:Deposited", async ({ event, context }) => {
  const poolId = event.args._poolid;

  // Check if this pool id is for one of our Pendle markets
  const boosterRecord = await context.db.sql.query.PendleBooster.findFirst({
    where: eq(PendleBooster.eqbPoolId, poolId),
  });

  if (boosterRecord) {
    const market = boosterRecord.market;
    const depositor = event.args._user;
    const amount = event.args._amount;

    await context.db
      .insert(PendleLpBalance)
      .values({
        id: `${market}-${depositor}`,
        balance: amount,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + amount,
      }));
  }
});

ponder.on("EqbPendleBooster:Withdrawn", async ({ event, context }) => {
  const poolId = event.args._poolid;

  // Check if this pool id is for one of our Pendle markets
  const boosterRecord = await context.db.sql.query.PendleBooster.findFirst({
    where: eq(PendleBooster.eqbPoolId, poolId),
  });

  if (boosterRecord) {
    const market = boosterRecord.market;
    const depositor = event.args._user;
    const amount = event.args._amount;

    await context.db
      .update(PendleLpBalance, {
        id: `${market}-${depositor}`,
      })
      .set((row) => ({
        balance: row.balance - amount,
      }));
  }
});
