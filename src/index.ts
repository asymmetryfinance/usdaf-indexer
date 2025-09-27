// Import all event handlers - they register themselves with ponder when imported
import "./handlers/prices";
import "./handlers/stabilityPool";
import "./handlers/liquidation";
import "./handlers/convex";
import "./handlers/usdafLpBalance";
import "./handlers/afcvxLpBalance";
import "./handlers/afcvxBalance";
import "./handlers/susdafBalance";
import "./handlers/veasfLocks";
import "./handlers/dsaLpBalance";
import "./handlers/pendleLpBalances";
import "./handlers/eulerFrontierBalance";
import { ponder } from "ponder:registry";
import { TroveOperation, TroveUpdated, Redemption } from "ponder:schema";
import { PriceFeedAbi } from "../abis/PriceFeedAbi";
import { getAddress, erc4626Abi, zeroAddress } from "viem";

// mapping: TroveManager to column names
const tmToPriceFeed: Record<`0x${string}`, `0x${string}`> = {
  "0xF8a25a2E4c863bb7CEa7e4B4eeb3866BB7f11718":
    "0x7F575323DDEDFbad449fEf5459FaD031FE49520b",
  "0x7aFf0173e3D7C5416D8cAa3433871Ef07568220d":
    "0xF125C72aE447eFDF3fA3601Eda9AC0Ebec06CBB8",
  "0x53ce82AC43660AaB1F80FEcd1D74Afe7a033D505":
    "0x2113468843CF2d0FD976690F4Ec6e4213Df46911",
  "0x478E7c27193Aca052964C3306D193446027630b0":
    "0x653DF748Bf7A692555dCdbF4c504a8c84807f7C7",
  "0xfb17d0402ae557e3Efa549812b95e931B2B63bCE":
    "0xeaF3b36748D89d64EF1B6B3E1d7637C3E4745094",
  "0x7bd47Eca45ee18609D3D64Ba683Ce488ca9320A3":
    "0x4B74D043336678D2F62dae6595bc42DcCabC3BB1",
} as const;

// Re-export utility functions for use in other modules if needed
export { getStartOfDayUTC } from "./utils/dateUtils";

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
