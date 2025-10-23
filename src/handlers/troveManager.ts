import { ponder } from "ponder:registry";
import { TroveOperation, TroveUpdated, Redemption } from "ponder:schema";
import { PriceFeedAbi } from "../../abis/PriceFeedAbi";
import {
  getAddress,
  decodeFunctionData,
  encodeAbiParameters,
  keccak256,
  hexToBigInt,
} from "viem";
import { tmToPriceFeed, tmToZapper, tmToBorrowerOps } from "../mappings";
import { BorrowerOperationsAbi } from "../../abis/BorrowerOperationsAbi";
import { UsdafFlashZapperAbi } from "../../abis/UsdafFlashZapperAbi";

const ZAPPER_DEPLOYMENT_BLOCK: bigint = BigInt(23090319);

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
  const priceFeed = tmToPriceFeed[troveManager as keyof typeof tmToPriceFeed]!;

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
  const _op = event.args._operation;

  let ownerCollChange: bigint =
    _op === 0 || _op === 2 ? event.args._collChangeFromOperation : 0n;
  let leveragedCollChange: bigint = 0n;

  if (timestamp >= ZAPPER_DEPLOYMENT_BLOCK) {
    const borrowerOps =
      tmToBorrowerOps[troveManager as keyof typeof tmToBorrowerOps];
    const zapper = tmToZapper[troveManager as keyof typeof tmToZapper];

    if (_op === 0) {
      const traces = (await context.client.request({
        method: "trace_transaction" as any,
        params: [event.transaction.hash],
      })) as any[];

      // Extract input values from traces where open_leveraged_trove on Zapper is called by anyone
      const zapperInputs = traces
        .filter(
          (trace: any) =>
            trace.action &&
            getAddress(trace.action.to) === zapper &&
            trace.action.input.substring(0, 10) === "0x339f6958" // open_leveraged_trove 4byte
        )
        .map((trace: any) => trace.action.input);

      // Decode and check if any input matches the current TroveOperation event log
      for (const input of zapperInputs) {
        const { args } = decodeFunctionData({
          abi: UsdafFlashZapperAbi,
          data: input,
        });

        // Calculate troveId from function input in the same way as BorrowerOperations.sol
        const troveId = keccak256(
          encodeAbiParameters(
            [
              { name: "msg.sender", type: "address" },
              { name: "_owner", type: "address" },
              { name: "_owner_index", type: "uint256" },
            ],
            [
              zapper as `0x${string}`,
              args[0] as `0x${string}`,
              args[1] as bigint,
            ]
          )
        );
        // If the trove is opened through zapper, the calculated troveId will match the one in event log
        // so we extract the collateral portions from function input
        if (hexToBigInt(troveId) === event.args._troveId) {
          ownerCollChange = args[2] as bigint; // initial_collateral_amount
          leveragedCollChange =
            event.args._collChangeFromOperation - ownerCollChange;
          break;
        }
      }
    }

    if (_op === 2) {
      const traces = (await context.client.request({
        method: "trace_transaction" as any,
        params: [event.transaction.hash],
      })) as any[];

      // Extract input values from traces where Zapper called adjustTrove on BorrowerOperations
      const zapperInputs = traces
        .filter(
          (trace: any) =>
            trace.action &&
            getAddress(trace.action.from) === zapper && // from = zapper
            getAddress(trace.action.to) === borrowerOps && // to = borrowerOps
            trace.action.input.substring(0, 10) === "0x84e5253c" // adjustTrove 4byte
        )
        .map((trace: any) => trace.action.input);

      // Decode and check if any input matches the current TroveOperation event log
      for (const input of zapperInputs) {
        const { args } = decodeFunctionData({
          abi: BorrowerOperationsAbi,
          data: input,
        });

        // Check if all criteria are met
        const collChangeAbs =
          event.args._collChangeFromOperation < 0n
            ? -event.args._collChangeFromOperation
            : event.args._collChangeFromOperation;
        const isAddColl = event.args._collChangeFromOperation > 0n;

        // If matched, the entire coll change is leveraged through zapper
        if (
          args &&
          args[0] === event.args._troveId &&
          args[1] === collChangeAbs &&
          args[2] === isAddColl
        ) {
          ownerCollChange = 0n;
          leveragedCollChange = event.args._collChangeFromOperation;
          break;
        }
      }
    }
  }

  await context.db.insert(TroveOperation).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    timestamp: timestamp,
    transactionHash: event.transaction.hash,
    troveManager: troveManager,
    troveId: event.args._troveId,
    op: _op,
    annualInterestRate: event.args._annualInterestRate,
    debtIncreaseFromRedist: event.args._debtIncreaseFromRedist,
    debtIncreaseFromUpfrontFee: event.args._debtIncreaseFromUpfrontFee,
    debtChangeFromOperation: event.args._debtChangeFromOperation,
    collIncreaseFromRedist: event.args._collIncreaseFromRedist,
    collChangeFromOperation: event.args._collChangeFromOperation,
    ownerCollChange: ownerCollChange,
    leveragedCollChange: leveragedCollChange,
  });
});
