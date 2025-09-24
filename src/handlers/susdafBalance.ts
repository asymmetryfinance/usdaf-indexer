import { ponder } from "ponder:registry";
import { SusdafBalance } from "ponder:schema";
import { getAddress, zeroAddress } from "viem";

// sUSDaf
ponder.on("Susdaf:Transfer", async ({ event, context }) => {
  const sender = getAddress(event.args.sender);
  const receiver = getAddress(event.args.receiver);
  const shares = event.args.value;

  if (sender !== zeroAddress) {
    await context.db
      .update(SusdafBalance, { depositor: sender })
      .set((row) => ({
        balance: row.balance - shares,
      }));
  }

  if (receiver !== zeroAddress) {
    await context.db
      .insert(SusdafBalance)
      .values({
        depositor: receiver,
        balance: shares,
      })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + shares,
      }));
  }
});
