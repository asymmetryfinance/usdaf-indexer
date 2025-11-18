import { ponder } from "ponder:registry";
import { AfcvxBalance } from "ponder:schema";
import { getAddress, zeroAddress } from "viem";

// naked afCVX balance
ponder.on("Afcvx:Transfer", async ({ event, context }) => {
  const from = getAddress(event.args.from);
  const to = getAddress(event.args.to);
  const value = event.args.value;

  if (from !== zeroAddress && value !== 0n) {
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
