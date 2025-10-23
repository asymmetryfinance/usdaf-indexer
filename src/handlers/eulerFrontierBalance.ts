import { ponder } from "ponder:registry";
import { EulerFrontierBalance } from "ponder:schema";
import { getAddress, zeroAddress } from "viem";
import { evaultToColumn } from "../mappings";

// Euler Frontier
ponder.on("EulerVault:Transfer", async ({ event, context }) => {
  const evault = getAddress(event.log.address);
  const from = getAddress(event.args.from);
  const to = getAddress(event.args.to);
  const shares = event.args.value;

  const column = evaultToColumn[evault as keyof typeof evaultToColumn];

  if (from !== zeroAddress) {
    await context.db
      .update(EulerFrontierBalance, { depositor: from })
      .set((row) => ({
        [column]: row[column] - shares,
      }));
  }

  if (to !== zeroAddress) {
    await context.db
      .insert(EulerFrontierBalance)
      .values({ depositor: to, [column]: shares })
      .onConflictDoUpdate((row) => ({
        [column]: row[column] + shares,
      }));
  }
});
