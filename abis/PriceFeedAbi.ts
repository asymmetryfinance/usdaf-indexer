export const PriceFeedAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_ethUsdOracleAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_ethUsdStalenessThreshold",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_borrowerOperationsAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  { inputs: [], name: "InsufficientGasForExternalCall", type: "error" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "_failedOracleAddr",
        type: "address",
      },
    ],
    name: "ShutDownFromOracleFailure",
    type: "event",
  },
  {
    inputs: [],
    name: "ethUsdOracle",
    outputs: [
      {
        internalType: "contract AggregatorV3Interface",
        name: "aggregator",
        type: "address",
      },
      { internalType: "uint256", name: "stalenessThreshold", type: "uint256" },
      { internalType: "uint8", name: "decimals", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "fetchPrice",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "bool", name: "", type: "bool" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "fetchRedemptionPrice",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "bool", name: "", type: "bool" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "lastGoodPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "priceSource",
    outputs: [
      {
        internalType: "enum IMainnetPriceFeed.PriceSource",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
