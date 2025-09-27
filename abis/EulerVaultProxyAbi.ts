export const EulerVaultProxyAbi = [
  {
    inputs: [{ internalType: "bytes", name: "trailingData", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  { anonymous: false, inputs: [], name: "Genesis", type: "event" },
  { stateMutability: "payable", type: "fallback" },
] as const;
