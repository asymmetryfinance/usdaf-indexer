import { ponder } from "ponder:registry";
import axios from "axios";
import { Prices } from "ponder:schema";
import { erc4626Abi } from "viem";
import { symbolToColumn } from "../mappings";
import { getStartOfDayUTC } from "../utils/dateUtils";

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
