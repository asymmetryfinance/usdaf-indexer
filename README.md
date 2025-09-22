# USDaf Indexer

Currently indexes data to calculate StabilityPool APYs, but can be expanded in the future.

## Setup

1. Install packages

```bash
yarn install
```

2. Create/edit `.env.local` with 2 environment variables

`PONDER_RPC_URL_1=` Mainnet RPC URL  
`DATABASE_URL=` Postgres database url

3. Start the indexer

```bash
yarn start --schema [DATABASE_SCHEMA]
```

_Replace `[DATABASE_SCHEMA]` with a unique identifier for your schema version_

After starting the indexer, you can access:

- GraphQL Interface: `http://localhost:42069`
- GraphQL Queries: `http://localhost:42069/graphql`
- Directly querying your Postgres instance

## Schema

The schema is located in `ponder.schema.ts`

All timestamps (excl. "lastUpdated") are converted to UTC 0000 of the day (timezone naive).  
That means, all tables have 1 row max per day since the deployment of USDaf v2, timestamped at 0000.  
All balance changes within the day are aggregated into that row.

`InterestRewards`

- Each row records the total interest minted to each SP in a day
- If no interest minted to any of the SPs, no record will be created for the day

`LiquidationRewards`

- Each row records the collateral transferred to each SP from liquidations in a day
- If no liquidation occurred, no record will be created for the day

`SpUsdafBalances`

- Each row records the USDaf balances in each SP in a day
- If no USDaf transferred to/from any of the SPs, no record will be created for the day

When querying the above tables, it may be necessary to forward fill data for days with no events.

`CurrentSpUsdafBalances`

- Records the current USDaf balances in each SP
- Only 1 row exists that is continuously updated with latest values
- Column `lastUpdated` records the actual block timestamp when table updated, without conversion

`Prices`

- Daily collateral prices fetched from Defillama API
- ysyBOLD prices read directly from ERC-4626 contract -- convertToAssets(1e18)

`CurrentSpDepositorsBalances`

- Records the current USDaf amount contributed by each user in each SP
- Balances updated on each deposit/withdrawal

`UsdafLpBalance`

- "balance": records scrvUSD-USDaf Curve LP token amount
- "yvaultShares": records vault share amount, call pricePerShare to convert to Curve LP amount

`AfcvxLpBalance`

- "balance": records CVX-afCVX Curve LP token amount
- "yvaultShares": records vault share amount, call pricePerShare to convert to Curve LP amount

`AfcvxBalance`

- Records afCVX amount for each depositor

`SusdafBalance`

- sUSDaf vault share balance

`VeasfLocks` 
- Records all locks from deployment

## Deployment and Database

See [Ponder Docs](https://ponder.sh/docs/production/self-hosting)
