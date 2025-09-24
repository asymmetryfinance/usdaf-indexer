// mapping: StabilityPool to column names
export const spToColumn = {
  "0x83e5BDe77d7477eCd972E338541b90Af57675536": "ysyBOLD",
  "0xd48dC7cDdc481F596BD9A97755c7Ac696aD4eA87": "scrvUSD",
  "0xb571781CEdf07257d60d6b252a3D8b24150Ded97": "sUSDS",
  "0x446F358e3a927cc68F342141d78Aa2d1C54e18F0": "sfrxUSD",
  "0x545a7dDFd863bd7EA0BFc689125169598085f75e": "tBTC",
  "0x922faA141e95e43A9deEab8DaDe3Ac8d4a32AD5c": "WBTC",
} as const;

// mapping: TroveManager to column names
export const tmToColumn = {
  "0xF8a25a2E4c863bb7CEa7e4B4eeb3866BB7f11718": "ysyBOLD",
  "0x7aFf0173e3D7C5416D8cAa3433871Ef07568220d": "scrvUSD",
  "0x53ce82AC43660AaB1F80FEcd1D74Afe7a033D505": "sUSDS",
  "0x478E7c27193Aca052964C3306D193446027630b0": "sfrxUSD",
  "0xfb17d0402ae557e3Efa549812b95e931B2B63bCE": "tBTC",
  "0x7bd47Eca45ee18609D3D64Ba683Ce488ca9320A3": "WBTC",
} as const;

// Map: schema column -> defillama symbol
export const symbolToColumn = {
  sfrxusd: "sfrxUSD",
  scrvusd: "scrvUSD",
  susds: "sUSDS",
  tbtc: "tBTC",
  wbtc: "WBTC",
} as const;

// mapping: Euler vault to column names
export const evaultToColumn = {
  "0x477d7feE2d9dca0bA8F7CbEAa7da219b5bb2d1a7": "usdcShares",
  "0x46DEA62E4D631ce3FaC68ECeC2b1C4bA1500075A": "usdafShares",
  "0x51147D1af05AEb441dE62db292f46580084c8380": "usdtShares",
} as const;
