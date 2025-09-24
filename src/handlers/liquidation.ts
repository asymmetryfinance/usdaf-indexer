import { ponder } from "ponder:registry";
import { LiquidationRewards } from "ponder:schema";
import { getAddress } from "viem";
import { tmToColumn } from "../mappings";
import { getStartOfDayUTC } from "../utils/dateUtils";

// TroveManager Liquidation events
// Tracks collateral sent to SP on liquidation
ponder.on("TroveManager:Liquidation", async ({ event, context }) => {
  const timestamp = getStartOfDayUTC(Number(event.block.timestamp));
  const troveManager = getAddress(event.log.address);
  const collSentToSp = event.args._collSentToSP;

  const column = tmToColumn[troveManager as keyof typeof tmToColumn];
  // Insert or update the correct column in LiquidationRewards
  await context.db
    .insert(LiquidationRewards)
    .values({
      timestamp: BigInt(timestamp),
      [column]: collSentToSp,
    })
    .onConflictDoUpdate((row) => ({
      // Add the new value to the existing value for the correct column
      [column]: row[column] + collSentToSp,
    }));
});
