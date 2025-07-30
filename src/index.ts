import { ponder } from "ponder:registry";
import axios from "axios";
import {
  Prices,
  InterestRewards,
  LiquidationRewards,
  CurrentSpUsdafBalances,
  SpUsdafBalances,
} from "ponder:schema";
import { getAddress, erc4626Abi, zeroAddress } from "viem";

// mapping: StabilityPool to column names
const spToColumn = {
  "0x83e5BDe77d7477eCd972E338541b90Af57675536": "ysyBOLD",
  "0xd48dC7cDdc481F596BD9A97755c7Ac696aD4eA87": "scrvUSD",
  "0xb571781CEdf07257d60d6b252a3D8b24150Ded97": "sUSDS",
  "0x446F358e3a927cc68F342141d78Aa2d1C54e18F0": "sfrxUSD",
  "0x545a7dDFd863bd7EA0BFc689125169598085f75e": "tBTC",
  "0x922faA141e95e43A9deEab8DaDe3Ac8d4a32AD5c": "WBTC",
} as const;

// mapping: TroveManager to column names
const tmToColumn = {
  "0xF8a25a2E4c863bb7CEa7e4B4eeb3866BB7f11718": "ysyBOLD",
  "0x7aFf0173e3D7C5416D8cAa3433871Ef07568220d": "scrvUSD",
  "0x53ce82AC43660AaB1F80FEcd1D74Afe7a033D505": "sUSDS",
  "0x478E7c27193Aca052964C3306D193446027630b0": "sfrxUSD",
  "0xfb17d0402ae557e3Efa549812b95e931B2B63bCE": "tBTC",
  "0x7bd47Eca45ee18609D3D64Ba683Ce488ca9320A3": "WBTC",
} as const;

// utility: converts block ts to UTC 0000 of the day
function getStartOfDayUTC(unixTimestamp: number) {
  const date = new Date(unixTimestamp * 1000);
  return (
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
    1000
  );
}

// Fetch collateral prices once per day
// every 7200 blocks since USDaf v2 deployment -- see ponder.config
// prices from Defillama API, except ysyBOLD price read from contract
ponder.on("PricesUpdate:block", async ({ event, context }) => {
  const timestamp = getStartOfDayUTC(Number(event.block.timestamp));

  // fetch ysyBOLD price from contract
  const ysyBoldPrice = await context.client.readContract({
    abi: erc4626Abi,
    address: "0x23346B04a7f55b8760E5860AA5A77383D63491cD", // ysyBOLD 4626 contract
    functionName: "convertToAssets",
    args: [BigInt(1e18)],
  });

  // Coingecko coin ids
  // @dev Defillama API docs https://api-docs.defillama.com/#tag/coins/get/batchHistorical
  const coins = [
    "staked-frax-usd",
    "savings-crvusd",
    "susds",
    "tbtc",
    "wrapped-bitcoin",
  ];

  const queryCoins: Record<string, [number, number]> = {};
  for (const c of coins) {
    queryCoins[`coingecko:${c}`] = [timestamp - 86400, timestamp];
  }

  try {
    const response = await axios.get("https://coins.llama.fi/batchHistorical", {
      params: {
        coins: JSON.stringify(queryCoins),
      },
    });

    // Extract max price for each coin symbol
    const coinPrices = response.data.coins;
    // Map: schema column -> defillama symbol
    const symbolToColumn = {
      sfrxusd: "sfrxUSD",
      scrvusd: "scrvUSD",
      susds: "sUSDS",
      tbtc: "tBTC",
      wbtc: "WBTC",
    } as const;
    const priceInsert: Record<string, number> = {};
    for (const [key, valueRaw] of Object.entries(coinPrices)) {
      const value = valueRaw as any;
      const symbol = value.symbol?.toLowerCase();
      const column = symbolToColumn[symbol as keyof typeof symbolToColumn];
      if (!column) continue;
      // Find max price in the prices array
      const maxPrice = Array.isArray(value.prices)
        ? value.prices.reduce(
            (max: number, p: any) => (p.price > max ? p.price : max),
            -Infinity
          )
        : 0;
      priceInsert[column] = maxPrice;
    }

    await context.db.insert(Prices).values({
      timestamp: BigInt(timestamp),
      ysyBOLD: Number(ysyBoldPrice) / 1e18,
      scrvUSD: priceInsert.scrvUSD ?? 0,
      sUSDS: priceInsert.sUSDS ?? 0,
      sfrxUSD: priceInsert.sfrxUSD ?? 0,
      tBTC: priceInsert.tBTC ?? 0,
      WBTC: priceInsert.WBTC ?? 0,
    });
  } catch (error) {
    console.error("Error fetching batchHistorical from Defillama:", error);
  }
});

// USDaf Transfer events
// Tracks interest minted to SP and SP balances delta
ponder.on("USDaf:Transfer", async ({ event, context }) => {
  const timestamp = getStartOfDayUTC(Number(event.block.timestamp));
  const from = getAddress(event.args.from);
  const to = getAddress(event.args.to);

  // case if interest minted to SP
  if (
    from === zeroAddress &&
    Object.prototype.hasOwnProperty.call(spToColumn, to)
  ) {
    const column = spToColumn[to as keyof typeof spToColumn];
    // Insert or update the correct column in InterestRewards
    await context.db
      .insert(InterestRewards)
      .values({
        timestamp: BigInt(timestamp),
        [column]: Number(event.args.value) / 1e18,
      })
      .onConflictDoUpdate((row) => ({
        // Add the new value to the existing value for the correct column
        [column]: ((row as any)[column] ?? 0) + Number(event.args.value) / 1e18,
      }));
  }

  // case if USDaf trasnferred to SP
  if (Object.prototype.hasOwnProperty.call(spToColumn, to)) {
    const column = spToColumn[to as keyof typeof spToColumn];
    // first we add to the running balances of SP
    const currentSpUsdafBalances = await context.db
      .insert(CurrentSpUsdafBalances)
      .values({
        id: zeroAddress,
        lastUpdated: event.block.timestamp, // actual block ts
        [column]: Number(event.args.value) / 1e18,
      }) // the insert operation should only get hit once because we only have 1 row in this table
      .onConflictDoUpdate((row) => ({
        lastUpdated: event.block.timestamp,
        // Add the new value to the existing value for the correct column
        [column]: ((row as any)[column] ?? 0) + Number(event.args.value) / 1e18,
      }));
    // then we modify the daily balances table
    await context.db
      .insert(SpUsdafBalances)
      .values({
        timestamp: BigInt(timestamp),
        ysyBOLD: currentSpUsdafBalances.ysyBOLD,
        scrvUSD: currentSpUsdafBalances.scrvUSD,
        sUSDS: currentSpUsdafBalances.sUSDS,
        sfrxUSD: currentSpUsdafBalances.sfrxUSD,
        tBTC: currentSpUsdafBalances.tBTC,
        WBTC: currentSpUsdafBalances.WBTC,
      }) // if row does not exist for this day, create it
      .onConflictDoUpdate({
        ysyBOLD: currentSpUsdafBalances.ysyBOLD,
        scrvUSD: currentSpUsdafBalances.scrvUSD,
        sUSDS: currentSpUsdafBalances.sUSDS,
        sfrxUSD: currentSpUsdafBalances.sfrxUSD,
        tBTC: currentSpUsdafBalances.tBTC,
        WBTC: currentSpUsdafBalances.WBTC,
      }); // if row exists, update with latest balances
  }

  // case if USDaf transferred from SP
  if (Object.prototype.hasOwnProperty.call(spToColumn, from)) {
    const column = spToColumn[to as keyof typeof spToColumn];
    // first we subtract from the running balances of SP
    const currentSpUsdafBalances = await context.db
      .update(CurrentSpUsdafBalances, { id: zeroAddress })
      .set((row) => ({
        lastUpdated: event.block.timestamp,
        // Subtract the new value from the existing value for the correct column
        [column]: ((row as any)[column] ?? 0) - Number(event.args.value) / 1e18,
      }));
    // then we modify the daily balances table
    await context.db
      .insert(SpUsdafBalances)
      .values({
        timestamp: BigInt(timestamp),
        ysyBOLD: currentSpUsdafBalances.ysyBOLD,
        scrvUSD: currentSpUsdafBalances.scrvUSD,
        sUSDS: currentSpUsdafBalances.sUSDS,
        sfrxUSD: currentSpUsdafBalances.sfrxUSD,
        tBTC: currentSpUsdafBalances.tBTC,
        WBTC: currentSpUsdafBalances.WBTC,
      })
      .onConflictDoUpdate({
        ysyBOLD: currentSpUsdafBalances.ysyBOLD,
        scrvUSD: currentSpUsdafBalances.scrvUSD,
        sUSDS: currentSpUsdafBalances.sUSDS,
        sfrxUSD: currentSpUsdafBalances.sfrxUSD,
        tBTC: currentSpUsdafBalances.tBTC,
        WBTC: currentSpUsdafBalances.WBTC,
      });
  }
});

// TroveManager Liquidation events
// Tracks collateral sent to SP on liquidation
ponder.on("TroveManager:Liquidation", async ({ event, context }) => {
  const timestamp = getStartOfDayUTC(Number(event.block.timestamp));
  const troveManager = getAddress(event.log.address);
  const collSentToSp = Number(event.args._collSentToSP) / 1e18;

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
      [column]: ((row as any)[column] ?? 0) + collSentToSp,
    }));
});
