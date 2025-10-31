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
import { StakeDaoRewardVaultAbi } from "./abis/StakeDaoRewardVaultAbi";
import { SharedLiquidityGaugeProxyAbi } from "./abis/SharedLiquidityGaugeProxyAbi";
import { SharedLiquidityGaugeImplAbi } from "./abis/SharedLiquidityGaugeImplAbi";
import { ConvexFxnPoolRegistryAbi } from "./abis/ConvexFxnPoolRegistryAbi";
import { PendleMarketV3Abi } from "./abis/PendleMarketV3Abi";
import { EqbPendleBoosterImplAbi } from "./abis/EqbPendleBoosterImplAbi";
import { EqbPendleBoosterProxyAbi } from "./abis/EqbPendleBoosterProxyAbi";
import { Erc20Abi } from "./abis/Erc20Abi";
import { EulerVaultImplAbi } from "./abis/EulerVaultImplAbi";
import { EulerVaultProxyAbi } from "./abis/EulerVaultProxyAbi";
import { BeefyVaultV7ProxyAbi } from "./abis/BeefyVaultV7ProxyAbi";
import { BeefyVaultV7ImplAbi } from "./abis/BeefyVaultV7ImplAbi";

export default createConfig({
  database: {
    kind: "postgres",
    connectionString: process.env.DATABASE_URL!,
  },
  chains: {
    mainnet: {
      id: 1,
      rpc: process.env.PONDER_RPC_URL_1!,
      ws: process.env.PONDER_WS_RPC_URL_1!,
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
    // Stakedao v2 gauge
    ScrvusdUsdafSdGaugeV2: {
      chain: "mainnet",
      abi: StakeDaoRewardVaultAbi,
      address: "0xdC147Ba5aBD134f631A67190DEB97B7828B4aFB7",
      startBlock: 23276535,
    },
    // Yearn Vault
    ScrvusdUsdafYvault: {
      chain: "mainnet",
      abi: YearnTokenVaultAbi,
      address: "0xe3Bf2D04cd3B6e74613D36368c7D21B2d6C26d72",
      startBlock: 23034279,
    },
    ScrvusdUsdafBeefyVault: {
      chain: "mainnet",
      abi: mergeAbis([BeefyVaultV7ProxyAbi, BeefyVaultV7ImplAbi]),
      address: "0x5159B51CD1B72d3C6aD900B9C394E6B285017C42",
      startBlock: 23438936,
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
    CvxAfcvxSdGaugeV2: {
      chain: "mainnet",
      abi: StakeDaoRewardVaultAbi,
      address: "0x4cDab85fd47058Bd4487C0cb09Cfb90B7D14D114",
      startBlock: 23276582,
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
    // Defi Stable Avengers Pool
    DsaLp: {
      chain: "mainnet",
      abi: CurveStableSwapNgAbi,
      address: "0x8B878AFE454e31CF0A79c6D7cf2f077DD286C12f",
      startBlock: 23240176,
    },
    // Defi Stable Avengers Pool FXN gauge
    DsaFxnGauge: {
      chain: "mainnet",
      abi: mergeAbis([
        SharedLiquidityGaugeProxyAbi,
        SharedLiquidityGaugeImplAbi,
      ]),
      address: "0xE534E5e86382d64133ecd6b7f717C69BEC8B40CA",
      startBlock: 23287332,
    },
    // Convex FXN pool registry
    ConvexFxnPoolRegistry: {
      chain: "mainnet",
      abi: ConvexFxnPoolRegistryAbi,
      address: "0xdB95d646012bB87aC2E6CD63eAb2C42323c1F5AF",
      startBlock: 23240176, // DsaLp deployment block
    },
    // Curve gauge
    DsaLpGauge: {
      chain: "mainnet",
      abi: CurveLiquidityGaugeV6Abi,
      address: "0xb91cE18be6e3c04a8D22E350551e4313dE23527d",
      startBlock: 23240181,
    },
    // Pendle
    UsdafPendleLp: {
      chain: "mainnet",
      abi: PendleMarketV3Abi,
      address: "0x8Bf03ACbF1C2aC2e487c80678De7873C954525D2",
      startBlock: 23026848,
    },
    UsdafPenpieReceipt: {
      chain: "mainnet",
      abi: Erc20Abi,
      address: "0xae0649aC58028cdca9294069EE6A31373B1DBD3C",
      startBlock: 23087855,
    },
    UsdafPendleSdGauge: {
      chain: "mainnet",
      abi: StakeDaoLiquidityGaugeV4Abi,
      address: "0x424973922B5f2cb4D71930729396d39cb123AB99",
      startBlock: 23083580,
    },
    SusdafPendleLp: {
      chain: "mainnet",
      abi: PendleMarketV3Abi,
      address: "0x233f5adf236CAB22C5DbDD3333a7EfD8267d7AEE",
      startBlock: 23036283,
    },
    SusdafPenpieReceipt: {
      chain: "mainnet",
      abi: Erc20Abi,
      address: "0x9bDE460dBbe1d53B8162D1f63E73B919592ba56b",
      startBlock: 23087857,
    },
    SusdafPendleSdGauge: {
      chain: "mainnet",
      abi: StakeDaoLiquidityGaugeV4Abi,
      address: "0x99EFf235f0e3B5b22D1863Ca95e7c778258A9e69",
      startBlock: 23083580,
    },
    EqbPendleBooster: {
      chain: "mainnet",
      abi: mergeAbis([EqbPendleBoosterProxyAbi, EqbPendleBoosterImplAbi]),
      address: "0x4D32C8Ff2fACC771eC7Efc70d6A8468bC30C26bF",
      startBlock: 23026848, // UsdafPendleLp deployment block
    },
    // Euler
    EulerVault: {
      chain: "mainnet",
      abi: mergeAbis([EulerVaultProxyAbi, EulerVaultImplAbi]),
      address: [
        "0x477d7feE2d9dca0bA8F7CbEAa7da219b5bb2d1a7", // USDC
        "0x46DEA62E4D631ce3FaC68ECeC2b1C4bA1500075A", // USDaf
        "0x51147D1af05AEb441dE62db292f46580084c8380", // USDT
      ],
      startBlock: 23390752,
    },
    LqtyforksLp: {
      chain: "mainnet",
      abi: CurveStableSwapNgAbi,
      address: "0x54628EA95D7e748c3783b855f4583DA96FB21895",
      startBlock: 23338829,
    },
    LqtyforksGauge: {
      chain: "mainnet",
      abi: CurveLiquidityGaugeV6Abi,
      address: "0xF575337B54C101111DA80B7a2e5440F6177BFF1a",
      startBlock: 23379705,
    },
    LqtyforksSdGaugeV2: {
      chain: "mainnet",
      abi: StakeDaoRewardVaultAbi,
      address: "0x690a086971A95c4fb91f5d692Aa0c6ca955f3061",
      startBlock: 23488498,
    },
    FraxAfLp: {
      chain: "mainnet",
      abi: CurveStableSwapNgAbi,
      address: "0x20d4c49a873EaeFf76EfBD0cF19002F6E19EF52c",
      startBlock: 23498052,
    },
    FraxAfGauge: {
      chain: "mainnet",
      abi: CurveLiquidityGaugeV6Abi,
      address: "0xE424b21a40CAd025B2f806B9a2d32Fdeaa78eE58",
      startBlock: 23498054,
    },
    FraxAfSdGaugeV2: {
      chain: "mainnet",
      abi: StakeDaoRewardVaultAbi,
      address: "0x1D63392E93fBbe963d7D955626FB41Ad5E784fd3",
      startBlock: 23690974,
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
