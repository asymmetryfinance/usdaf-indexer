import { ponder } from "ponder:registry";
import { DsaLpBalance, DsaLpConvexVaultMapping } from "ponder:schema";
import { getAddress, zeroAddress } from "viem";

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
  if (event.args.sender !== zeroAddress && event.args.value !== 0n) {
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
  if (event.args.from !== zeroAddress && event.args.value !== 0n) {
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
  if (event.args._from !== zeroAddress && event.args._value !== 0n) {
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
