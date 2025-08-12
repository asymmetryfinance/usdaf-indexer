import { createConfig, mergeAbis } from "ponder";

import { StabilityPoolAbi } from "./abis/StabilityPoolAbi";
import { CurveStableSwapNgAbi } from "./abis/CurveStableSwapNgAbi";
import { CurveLiquidityGaugeV6Abi } from "./abis/CurveLiquidityGaugeV6Abi";
import { ConvexBoosterAbi } from "./abis/ConvexBoosterAbi";
import { USDafAbi } from "./abis/USDafAbi";
import { TroveManagerAbi } from "./abis/TroveManagerAbi";
import { StakeDaoLiquidityGaugeV4Abi } from "./abis/StakeDaoLiquidityGaugeV4Abi";
import { YearnTokenVaultAbi } from "./abis/YearnTokenVaultAbi";
import { AfCvxImplAbi } from "./abis/AfCvxImplAbi";
import { AfCvxProxyAbi } from "./abis/AfCvxProxyAbi";
import { YearnV3VaultAbi } from "./abis/YearnV3VaultAbi";
import { TokenLockerAbi } from "./abis/TokenLockerAbi";

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
    Veasf: {
      chain: "mainnet",
      abi: TokenLockerAbi,
      address: "0xF119B5Aa93a7755b09952B3a88D04cdAf5329034",
      startBlock: 21018718,
    },
    // external contracts
    ScrvusdUsdafLp: {
      chain: "mainnet",
      abi: CurveStableSwapNgAbi,
      address: "0x3bE454C4391690ab4DDae3Fb987c8147b8Ecc08A",
      startBlock: 22981417,
    },
    // Curve gauge
    ScrvusdUsdafGauge: {
      chain: "mainnet",
      abi: CurveLiquidityGaugeV6Abi,
      address: "0x3e56EC9bD2992D9220eD615CEaeC59613cCac730",
      startBlock: 22981423,
    },
    ConvexBooster: {
      chain: "mainnet",
      abi: ConvexBoosterAbi,
      address: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
      startBlock: 20379293, // CVX-afCVX deployment block
    },
    // Stakedao gauge
    ScrvusdUsdafSdGauge: {
      chain: "mainnet",
      abi: StakeDaoLiquidityGaugeV4Abi,
      address: "0xc9f278b4EeC0f7cD90c621d2f1432e5EE7F55738",
      startBlock: 23089468,
    },
    // Yearn Vault
    ScrvusdUsdafYvault: {
      chain: "mainnet",
      abi: YearnTokenVaultAbi,
      address: "0xe3Bf2D04cd3B6e74613D36368c7D21B2d6C26d72",
      startBlock: 23034279,
    },
    // afCVX
    Afcvx: {
      chain: "mainnet",
      abi: mergeAbis([AfCvxProxyAbi, AfCvxImplAbi]),
      address: "0x8668a15b7b023Dc77B372a740FCb8939E15257Cf",
      startBlock: 19784027,
    },
    CvxAfcvxLp: {
      chain: "mainnet",
      abi: CurveStableSwapNgAbi,
      address: "0x7956FAd09a1D1C47550331E7f06bF7c7B7C2aF08",
      startBlock: 20379393,
    },
    // Stakedao gauge
    CvxAfcvxSdGauge: {
      chain: "mainnet",
      abi: StakeDaoLiquidityGaugeV4Abi,
      address: "0xD47FC7704dc185feb5195416E16ae531eFa400A4",
      startBlock: 21445720,
    },
    // Curve gauge
    CvxAfcvxGauge: {
      chain: "mainnet",
      abi: CurveLiquidityGaugeV6Abi,
      address: "0x9755e37A291a37d8a0AB0828699A59b445477514",
      startBlock: 20379532,
    },
    // Yearn vault
    CvxAfcvxYvault: {
      chain: "mainnet",
      abi: YearnTokenVaultAbi,
      address: "0x97aae86E5efC305f2189f78B5C7e9Dac1249c379",
      startBlock: 22391253,
    },
    // sUSDaf
    Susdaf: {
      chain: "mainnet",
      abi: YearnV3VaultAbi,
      address: "0x89E93172AEF8261Db8437b90c3dCb61545a05317",
      startBlock: 22978001,
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
