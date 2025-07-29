import { createConfig } from "ponder";

import { StabilityPoolAbi } from "./abis/StabilityPoolAbi";
import { USDafAbi } from "./abis/USDafAbi";
import { TroveManagerAbi } from "./abis/TroveManagerAbi";

export default createConfig({
  database: {
    kind: "postgres",
    connectionString: process.env.DATABASE_URL!,
  },
  chains: {
    mainnet: {
      id: 1,
      rpc: process.env.PONDER_RPC_URL_1!,
    },
  },
  contracts: {
    StabilityPool: {
      chain: "mainnet",
      abi: StabilityPoolAbi,
      address: [
        "0x83e5BDe77d7477eCd972E338541b90Af57675536",
        "0xd48dC7cDdc481F596BD9A97755c7Ac696aD4eA87",
        "0xb571781CEdf07257d60d6b252a3D8b24150Ded97",
        "0x446F358e3a927cc68F342141d78Aa2d1C54e18F0",
        "0x545a7dDFd863bd7EA0BFc689125169598085f75e",
        "0x922faA141e95e43A9deEab8DaDe3Ac8d4a32AD5c",
      ], // ordered by CollateralRegistry index
      startBlock: 22976161,
    },
    USDaf: {
      chain: "mainnet",
      abi: USDafAbi,
      address: "0x9Cf12ccd6020b6888e4D4C4e4c7AcA33c1eB91f8",
      startBlock: 22976155,
    },
    TroveManager: {
      chain: "mainnet",
      abi: TroveManagerAbi,
      address: [
        "0xF8a25a2E4c863bb7CEa7e4B4eeb3866BB7f11718",
        "0x7aFf0173e3D7C5416D8cAa3433871Ef07568220d",
        "0x53ce82AC43660AaB1F80FEcd1D74Afe7a033D505",
        "0x478E7c27193Aca052964C3306D193446027630b0",
        "0xfb17d0402ae557e3Efa549812b95e931B2B63bCE",
        "0x7bd47Eca45ee18609D3D64Ba683Ce488ca9320A3",
      ], // ordered by CollateralRegistry index
      startBlock: 22976161,
    },
  },
  blocks: {
    PricesUpdate: {
      chain: "mainnet",
      interval: 7200, // once per day
      startBlock: 22976161,
    },
  },
});
