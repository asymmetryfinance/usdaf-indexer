import { ponder } from "ponder:registry";
import { TroveOperation, TroveUpdated, Redemption } from "ponder:schema";
import { PriceFeedAbi } from "../../abis/PriceFeedAbi";
import { getAddress } from "viem";
import { tmToPriceFeed } from "../mappings";

// Redemptions
ponder.on("TroveManager:Redemption", async ({ event, context }) => {
  const troveManager = getAddress(event.log.address);
  const timestamp = event.block.timestamp;

  const results: any[] = await context.client.multicall({
    contracts: [
      {
        abi: context.contracts.TroveManager.abi,
        address: troveManager,
        functionName: "getEntireBranchColl",
      },
      {
        abi: context.contracts.TroveManager.abi,
        address: troveManager,
        functionName: "getEntireBranchDebt",
      },
    ],
  });

  const [entireColl, entireDebt] = results.map((r) => {
    if (r.status === "success") return r.result;
    throw r.error;
  });

  await context.db.insert(Redemption).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    timestamp: timestamp,
    transactionHash: event.transaction.hash,
    troveManager: troveManager,
    attemptedBoldAmount: event.args._attemptedBoldAmount,
    debtDecrease: event.args._actualBoldAmount,
    collDecrease: event.args._ETHSent,
    price: event.args._price,
    redemptionPrice: event.args._redemptionPrice,
    entireColl: entireColl as bigint,
    entireDebt: entireDebt as bigint,
  });
});

// TroveUpdated
ponder.on("TroveManager:TroveUpdated", async ({ event, context }) => {
  const troveManager = getAddress(event.log.address);
  const timestamp = event.block.timestamp;
  const priceFeed = tmToPriceFeed[troveManager as keyof typeof tmToPriceFeed];

  const results: any[] = await context.client.multicall({
    contracts: [
      {
        abi: context.contracts.TroveManager.abi,
        address: troveManager,
        functionName: "getEntireBranchColl",
      },
      {
        abi: context.contracts.TroveManager.abi,
        address: troveManager,
        functionName: "getEntireBranchDebt",
      },
      {
        abi: PriceFeedAbi,
        address: priceFeed,
        functionName: "lastGoodPrice",
      },
    ],
  });

  const [entireColl, entireDebt, price] = results.map((r) => {
    if (r.status === "success") return r.result;
    throw r.error;
  });

  await context.db.insert(TroveUpdated).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    timestamp: timestamp,
    transactionHash: event.transaction.hash,
    troveManager: troveManager,
    troveId: event.args._troveId,
    debt: event.args._debt,
    coll: event.args._coll,
    stake: event.args._stake,
    annualInterestRate: event.args._annualInterestRate,
    entireColl: entireColl,
    entireDebt: entireDebt,
    price: price,
  });
});

// TroveOperation
ponder.on("TroveManager:TroveOperation", async ({ event, context }) => {
  const troveManager = getAddress(event.log.address);
  const timestamp = event.block.timestamp;

  await context.db.insert(TroveOperation).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    timestamp: timestamp,
    transactionHash: event.transaction.hash,
    troveManager: troveManager,
    troveId: event.args._troveId,
    op: event.args._operation,
    annualInterestRate: event.args._annualInterestRate,
    debtIncreaseFromRedist: event.args._debtIncreaseFromRedist,
    debtIncreaseFromUpfrontFee: event.args._debtIncreaseFromUpfrontFee,
    debtChangeFromOperation: event.args._debtChangeFromOperation,
    collIncreaseFromRedist: event.args._collIncreaseFromRedist,
    collChangeFromOperation: event.args._collChangeFromOperation,
  });
});
