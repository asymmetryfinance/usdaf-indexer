import marimo

__generated_with = "0.15.0"
app = marimo.App(width="full")


@app.cell
def _():
    import marimo as mo
    import plotly.express as px
    import plotly.graph_objects as go
    import polars as pl
    from gql import Client, gql
    from gql.transport.aiohttp import AIOHTTPTransport
    from rich import print
    from rich.traceback import install

    install()


    url = "http://localhost:42069/graphql"

    transport = AIOHTTPTransport(url=url)
    gql_client = Client(transport=transport, fetch_schema_from_transport=True)

    return gql, gql_client, mo, pl, px


@app.cell
def _(mo):
    mo.md(
        r"""
    # MCR borrowing capacity modelling



    `D_max = Maximum debt that can be borrowed at 1.1 MCR given current TCR = degen capacity before TCR < CCR`  
    `D_max = (entireColl × price - CCR × entireDebt) / (CCR - MCR)`

    - We quantify the system's capacity to borrow at MCR. This is the amount that can be borrowed at 110% CR before TCR < CCR.
    - Every redemption improves TCR but may lead to fully redeemed troves.
    - We reserve the collateral amounts for fully redeemed troves before MCR capacity calcs.
    - Modelling shows that the system can still have decent MCR borrowing capacity while reserving withdrawal capacity for fully redeemed troves.
    """
    )
    return


@app.cell
def _(mo):
    mo.md(
        r"""
    ### Branch state after every redemption

    `collDecrease` `debtDecrease`: Amounts reduced by redemption  
    `_0`: columns are values before the redemption  
    `MCR_debt_cap`: amount of debt that can be borrowed at MCR before TCR < CCR  
    `MCR_coll_cap`: corresponding amount of collateral relative to MCR_debt_cap
    """
    )
    return


@app.cell
async def _(gql, gql_client, pl):
    tm_names = {
      "0xF8a25a2E4c863bb7CEa7e4B4eeb3866BB7f11718": "ysyBOLD",
      "0x7aFf0173e3D7C5416D8cAa3433871Ef07568220d": "scrvUSD",
      "0x53ce82AC43660AaB1F80FEcd1D74Afe7a033D505": "sUSDS",
      "0x478E7c27193Aca052964C3306D193446027630b0": "sfrxUSD",
      "0xfb17d0402ae557e3Efa549812b95e931B2B63bCE": "tBTC",
      "0x7bd47Eca45ee18609D3D64Ba683Ce488ca9320A3": "WBTC",
    }
    tm_names = {k.lower(): v for k, v in tm_names.items()}

    branch_mcr = {
      "ysyBOLD": 1.1,
      "scrvUSD": 1.1,
      "sUSDS": 1.1,
      "sfrxUSD": 1.1,
      "tBTC": 1.2,
      "WBTC": 1.2,
    }

    branch_ccr = {
        "ysyBOLD": 1.2,
        "scrvUSD": 1.2,
        "sUSDS": 1.2,
        "sfrxUSD": 1.2,
        "tBTC": 1.5,
        "WBTC": 1.5,
    }

    async def get_redemptions():
        async with gql_client as client:
            query = gql(
                """
                query MyQuery($after: String) {
                  redemptions(after: $after) {
                    pageInfo {
                      endCursor
                      hasNextPage
                      hasPreviousPage
                      startCursor
                    }
                    items {
                      collDecrease
                      debtDecrease
                      id
                      price
                      timestamp
                      troveManager
                      entireColl
                      entireDebt
                      transactionHash
                    }
                  }
                }
                """
            )

            vars = {}

            r = await client.execute(query, variable_values=vars, parse_result=True)

            results: list = r["redemptions"]["items"]
            has_next_page = r["redemptions"]["pageInfo"]["hasNextPage"]

            while has_next_page:
                vars["after"] = r["redemptions"]["pageInfo"]["endCursor"]
                r = await client.execute(query, variable_values=vars, parse_result=True)
                results += r["redemptions"]["items"]
                has_next_page = r["redemptions"]["pageInfo"]["hasNextPage"]

            return results

    results = await get_redemptions()
    df = pl.from_records(results)
    df = df.with_columns(
        (pl.col("timestamp").cast(pl.Int64) * 1000)
        .cast(pl.Datetime(time_unit="ms")),
        pl.col("collDecrease").cast(pl.Float64) / 10**18,
        pl.col("debtDecrease").cast(pl.Float64) / 10**18,
        pl.col("price").cast(pl.Float64) / 10**18,
        pl.col("entireColl").cast(pl.Float64) / 10**18,
        pl.col("entireDebt").cast(pl.Float64) / 10**18,
        pl.col("troveManager").replace(tm_names)
    )

    df = df.with_columns(
        pl.col("troveManager").replace_strict(branch_mcr, return_dtype=pl.Float64).alias("MCR"),
        pl.col("troveManager").replace_strict(branch_ccr, return_dtype=pl.Float64).alias("CCR"),
    )

    df = df.sort(by="timestamp")

    df = df.with_columns(
        (pl.col("entireColl") + pl.col("collDecrease")).alias("entireColl_0"),
        (pl.col("entireDebt") + pl.col("debtDecrease")).alias("entireDebt_0")
    )

    df = df.with_columns(
        (pl.col("entireColl") * pl.col("price") / pl.col("entireDebt")).alias("TCR"),
        (pl.col("entireColl_0") * pl.col("price") / pl.col("entireDebt_0")).alias("TCR_0")
    )

    df = df.with_columns(
        (pl.col("TCR") - pl.col("TCR_0")).alias("TCR_delta")
    )

    # D_max = Maximum debt that can be borrowed at 1.1 MCR given current TCR = degen capacity before TCR < CCR
    # D_max = (entireColl × price - CCR × entireDebt) / (CCR - MCR)
    df = df.with_columns(
        (((pl.col("entireColl") * pl.col("price")) - (pl.col("CCR") * pl.col("entireDebt"))) / (pl.col("CCR") - pl.col("MCR"))).alias("MCR_debt_cap"),
        (((pl.col("entireColl_0") * pl.col("price")) - (pl.col("CCR") * pl.col("entireDebt_0"))) / (pl.col("CCR") - pl.col("MCR"))).alias("MCR_debt_cap_0"),
    )

    df = df.with_columns(
        (pl.col("MCR_debt_cap") * pl.col("MCR") / pl.col("price")).alias("MCR_coll_cap"),
        (pl.col("MCR_debt_cap_0") * pl.col("MCR") / pl.col("price")).alias("MCR_coll_cap_0"),
    )

    df = df.with_columns(
        (pl.col("MCR_debt_cap") - pl.col("MCR_debt_cap_0")).alias("MCR_debt_cap_delta"),
        (pl.col("MCR_coll_cap") - pl.col("MCR_coll_cap_0")).alias("MCR_coll_cap_delta")
    )
    df
    return branch_ccr, branch_mcr, df, tm_names


@app.cell
def _(mo):
    mo.md(
        r"""
    ### TCR and MCR debt cap delta pct change after redemptions 

    - Every redemption improves TCR and increases the amount of debt that can be minted at MCR.
    - Upward trendline indicates that more MCR debt can be minted per TCR change.
    - Flat trendline indicates approximately equal changes, this means branch capacity to min MCR debt is maintained/improved over time.
    """
    )
    return


@app.cell
def _(df, pl, px):
    cap_change_df = df.with_columns(
        (pl.col("TCR_delta") * 100).alias("TCR_delta_pct"),
        ((pl.col("MCR_debt_cap_delta") - pl.col("MCR_debt_cap_0")) / pl.col("MCR_debt_cap_0")).alias("MCR_debt_cap_delta_pct"),
         pl.col("troveManager")
    )
    px.scatter(
        cap_change_df,
        x="TCR_delta_pct",
        y="MCR_debt_cap_delta_pct",
        color="troveManager",
        trendline="ols"
    )
    return


@app.cell
async def _(gql, gql_client, pl, tm_names):

    async def get_troves():
        async with gql_client as client:
            query = gql(
                """
                query MyQuery($after: String) {
                  troveUpdateds(after: $after) {
                    pageInfo {
                      endCursor
                      hasNextPage
                      hasPreviousPage
                      startCursor
                    }
                    items {
                      coll
                      debt
                      id
                      troveManager
                      transactionHash
                      timestamp
                      troveId
                      entireColl
                      entireDebt
                      price
                    }
                  }
                }
                """
            )

            vars = {}

            r = await client.execute(query, variable_values=vars, parse_result=True)

            results: list = r["troveUpdateds"]["items"]
            has_next_page = r["troveUpdateds"]["pageInfo"]["hasNextPage"]

            while has_next_page:
                vars["after"] = r["troveUpdateds"]["pageInfo"]["endCursor"]
                r = await client.execute(query, variable_values=vars, parse_result=True)
                results += r["troveUpdateds"]["items"]
                has_next_page = r["troveUpdateds"]["pageInfo"]["hasNextPage"]

            return results


    results_1 = await get_troves()

    tu_df = pl.from_records(results_1)
    tu_df = tu_df.with_columns(
        (pl.col("timestamp").cast(pl.Int64) * 1000)
        .cast(pl.Datetime(time_unit="ms")),
        pl.col("coll").cast(pl.Float64) / 10**18,
        pl.col("debt").cast(pl.Float64) / 10**18,
        pl.col("troveManager").replace(tm_names),
        pl.col("entireColl").cast(pl.Float64) / 10**18,
        pl.col("entireDebt").cast(pl.Float64) / 10**18,
        pl.col("price").cast(pl.Float64) / 10**18,
    )
    # tu_df
    return (tu_df,)


@app.cell
def _(mo):
    mo.md(r"""### Fully redeemed troves""")
    return


@app.cell
def _(df, pl, tu_df):
    txn_hash = df.select("transactionHash").to_dict()
    txn_hash = txn_hash["transactionHash"]

    tu_df_filtered = tu_df.filter(
        (pl.col("coll") > 0) & (pl.col("debt") == 0),
        pl.col("transactionHash").is_in(txn_hash)
    )
    tu_df_filtered
    return (tu_df_filtered,)


@app.cell
def _(mo):
    mo.md(r"""### Distribution of collateral amounts in fully redeemed troves""")
    return


@app.cell
def _(px, tu_df_filtered):
    px.box(
        tu_df_filtered,
        x="troveManager",
        y="coll",
        color="troveManager"
    )
    return


@app.cell
def _(pl, tu_df_filtered):
    tu_df_filtered_groupby = tu_df_filtered.group_by(["troveManager", "transactionHash"]).agg(pl.col("coll").sum())
    # tu_df_filtered_groupby

    return (tu_df_filtered_groupby,)


@app.cell
def _(df, pl, tu_df_filtered_groupby):
    df_joined = df.join(
        tu_df_filtered_groupby,
        on=["transactionHash", "troveManager"],
        how="left"
    )

    df_joined = df_joined.rename({"coll": "reserve_coll"})
    df_joined = df_joined.fill_null(strategy="zero")

    df_joined = df_joined.with_columns(
        ((((pl.col("entireColl") - pl.col("reserve_coll")) * pl.col("price")) - (pl.col("CCR") * pl.col("entireDebt"))) / (pl.col("CCR") - pl.col("MCR"))).alias("MCR_debt_cap_reserved"),
    )

    df_joined = df_joined.with_columns(
        (pl.col("MCR_debt_cap_reserved") * pl.col("MCR") / pl.col("price")).alias("MCR_coll_cap_reserved"),
    )

    # df_joined
    return (df_joined,)


@app.cell
def _(mo):
    mo.md(
        r"""
    ### MCR debt cap with reserve

    - After redemptions, if there are fully redeemed troves, we reserve their collateral amounts.
    - We calculate the branch capacity for borrowing at MCR after deducting the reserve amounts.
    - The y-axis values show how much debt can be minted at MCR before TCR < CCR, while still allowing fully redeemed troves to withdraw.
    """
    )
    return


@app.cell
def _(df_joined, px):
    px.line(
        df_joined,
        x="timestamp",
        y="MCR_debt_cap_reserved",
        color="troveManager"
    )
    return


@app.cell
def _(mo):
    mo.md(r"""### Redemptions that led to fully redeemed troves""")
    return


@app.cell
def _(df_joined, pl):
    reserve_coll_df = df_joined.filter(
        pl.col("reserve_coll") > 0
    )
    reserve_coll_df
    return (reserve_coll_df,)


@app.cell
def _(mo):
    mo.md(
        r"""
    ### Amount of debt that can be minted at MCR with reserve

    - Data points from historical redemptions that led to fully redeemed troves.
    - This means their collateral must be reserved before calculating MCR debt capacity.
    - Most data points are still positive, which means in most cases, users can still borrow at MCR even after reserving capacity for withdrawals.
    """
    )
    return


@app.cell
def _(px, reserve_coll_df):
    px.scatter(
        reserve_coll_df,
        y="MCR_debt_cap_reserved",
        x="timestamp",
        color="troveManager"
    )
    return


@app.cell
def _(pl, tu_df):
    tu_df.with_columns(
        pl.col("timestamp").dt.date()
    )
    return


@app.cell
def _(mo):
    mo.md(
        r"""
    # Withdrawal capacity modelling

    - For every single trove, we can calculate TCR_delta if the trove were to be closed at any point
    - Positive TCR_delta improves branch TCR and negative TCR_delta lowers it
    - At any point in time, if ICR < TCR, then TCR_delta will be positive. If ICR > TCR, then TCR_delta will be negative.
    - For a trove that produces negative TCR_delta, it can only be closed when the branch has enough buffer (TCR - CCR) to cover the delta while not dropping below CCR
    """
    )
    return


@app.cell
def _(branch_ccr, branch_mcr, pl, tu_df):
    tu_df_1= tu_df.with_columns(
        pl.col("troveManager").replace_strict(branch_mcr, return_dtype=pl.Float64).alias("MCR"),
        pl.col("troveManager").replace_strict(branch_ccr, return_dtype=pl.Float64).alias("CCR"),
        pl.col("timestamp").dt.date()
    )
    tu_df_1 = tu_df_1.sort(by="timestamp")

    tu_df_1 = tu_df_1.with_columns(
        ((pl.col("entireColl") * pl.col("price")) / pl.col("entireDebt")).alias("TCR")
    )
    # tu_df_1
    return (tu_df_1,)


@app.cell
def _(tu_df_1):
    last_update_daily = tu_df_1.group_by(["troveId", "timestamp"], maintain_order=True).last()
    last_update_daily = last_update_daily.select(["troveId", "timestamp", "coll", "debt", "troveManager"])
    # last_update_daily
    return (last_update_daily,)


@app.cell
def _(tu_df_1):
    last_branch_state_daily = tu_df_1.group_by(["troveManager", "timestamp"], maintain_order=True).last()
    last_branch_state_daily = last_branch_state_daily.select(["troveManager", "timestamp", "entireColl", "entireDebt", "price", "MCR", "CCR", "TCR"])
    # last_branch_state_daily
    return (last_branch_state_daily,)


@app.cell
def _(mo):
    mo.md(
        r"""
    ### TroveUpdated Data

    - Data pulled from TroveUpdated events
    - After postprocessing, the dataframe contains all troves data on the days TroveUpdated events are logged
    - Note that the data provides a good representation of troves/branches states but should not be considered perfect sampling
    """
    )
    return


@app.cell
def _(last_branch_state_daily, last_update_daily, pl):
    all_timestamps = last_update_daily.select("timestamp").unique().sort("timestamp")
    all_trove_managers = last_update_daily.select("troveManager").unique()
    timestamp_trove_grid = all_timestamps.join(all_trove_managers, how="cross")

    troves_per_manager = (last_update_daily.group_by("troveManager")
    .agg(pl.col("troveId").unique().alias("troveIds"))
    .explode("troveIds")
    .rename({"troveIds": "troveId"}))

    complete_grid = (timestamp_trove_grid.join(troves_per_manager, on="troveManager", how="inner"))

    # Step 3: Left join with actual data to get updates where they exist
    expanded_data = (
        complete_grid
        .join(
            last_update_daily,
            on=["timestamp", "troveManager", "troveId"],
            how="left"
        )
    )

    # Step 4: Forward fill within each trove (grouped by troveId and troveManager)
    forward_filled = (
        expanded_data
        .sort("troveManager", "troveId", "timestamp")
        .with_columns([
            pl.col("coll").forward_fill().over("troveId"),
            pl.col("debt").forward_fill().over("troveId")
        ])
    )

    # Step 5: Remove rows where we don't have any data (troves that haven't started yet)
    # A trove starts existing when it first gets a non-null value
    forward_filled = (
        forward_filled
        .filter(pl.col("coll").is_not_null() & pl.col("debt").is_not_null())
    )

    # Step 6: Join with troveManager metadata
    active_troves = (
        forward_filled
        .join(
            last_branch_state_daily,
            on=["troveManager", "timestamp"],
            how="left"
        )
    )

    active_troves = active_troves.filter(
        (pl.col("coll") > 0) & (pl.col("debt") > 0) & pl.col("entireColl").is_not_null()
    )

    active_troves = active_troves.with_columns(
        (
            ((pl.col("entireColl") - pl.col("coll")) 
            * pl.col("price"))
            / (pl.col("entireDebt") - pl.col("debt"))
    
        ).alias("TCR_if_closed")
    ).with_columns(
        (pl.col("TCR_if_closed") > pl.col("CCR")).alias("closeable"),
        ((pl.col("coll") * pl.col("price")) / pl.col("debt")).alias("ICR"),
        (pl.col("TCR_if_closed") - pl.col("TCR")).alias("TCR_delta"),
        (pl.col("TCR") - pl.col("CCR")).alias("CCR_buffer")
    ).with_columns(
        (((pl.col("entireColl") * pl.col("price")) - ((pl.col("CCR") - pl.col("TCR_delta")) * pl.col("entireDebt"))) / ((pl.col("CCR") - pl.col("TCR_delta")) - pl.col("MCR"))).alias("MCR_debt_cap_reserve")
    ).with_columns(
        (pl.col("MCR_debt_cap_reserve") * pl.col("MCR") / pl.col("price")).alias("MCR_coll_cap_reserve")
    ).with_columns(
        (((pl.col("entireColl") * pl.col("price")) - (pl.col("CCR") * pl.col("entireDebt"))) / (pl.col("CCR") - pl.col("MCR"))).alias("MCR_debt_cap")
    ).with_columns(
        (pl.col("MCR_debt_cap") * pl.col("MCR") / pl.col("price")).alias("MCR_coll_cap")
    ).with_columns(
        (pl.col("CCR") - pl.col("TCR_delta")).alias("TCR_threshold")
    )

    active_troves
    return (active_troves,)


@app.cell
def _(mo):
    mo.md(r"""### ICR distribution""")
    return


@app.cell
def _(active_troves, pl, px):
    px.box(
        active_troves.filter((pl.col("ICR") < 3)),
        x="troveManager",
        y="ICR",
        color="closeable",
        points="all"
    )
    return


@app.cell
def _(mo):
    mo.md(
        r"""
    ### TCR_delta of different ICR troves

    - This shows close trove effect on the branch by different ICR troves
    - Focusing on the stables branches, as expected, ICR < CCR troves can always be closed with an improvement to TCR
    - Ignoring WBTC outliers, may be caused by early system state
    - Interestingly, ICR and TCR_delta only has a negative correlation when ICR < CCR
    - If ICR > CCR, TCR_delta shows relatively little variance
    - This could mean that we don't need significant TCR buffer to allow higher ICR troves to close, as the effect on TCR does not increase or scale
    """
    )
    return


@app.cell
def _(active_troves, pl, px):
    px.scatter(
        active_troves.filter((pl.col("ICR") < 3) & (pl.col("TCR_delta") < 1)), # filter outliers
        x="ICR",
        y="TCR_delta",
        color="closeable",
        facet_col="troveManager",
        facet_col_wrap=3
    )
    return


@app.cell
def _(mo):
    mo.md(
        r"""
    ### Are troves closeable given different CCR_buffer?

    - CCR_buffer = TCR (at time of sample) - CCR
    - Shows most troves are closeable with small buffer
    """
    )
    return


@app.cell
def _(active_troves, pl, px):
    px.scatter(
        active_troves.filter((pl.col("ICR") < 3)),
        x="ICR",
        y="CCR_buffer",
        color="closeable",
        facet_col="troveManager",
        facet_col_wrap=3
    )
    return


@app.cell
def _(mo):
    mo.md(r"""### Filter for troves that produces negative TCR_delta but still closeable""")
    return


@app.cell
def _(active_troves, pl):
    threshold_df = active_troves.filter(
        (pl.col("TCR_delta") < 0) & (pl.col("closeable") == True)
    )
    threshold_df
    return (threshold_df,)


@app.cell
def _(mo):
    mo.md(
        r"""
    ### Visualizing debt amounts borrowable at MCR while allowing withdrawals

    - Every point on this graph represents a point in time when closing a trove would negatively impact TCR (still can be closed)
    - We take the TCR delta if the trove were to be closed, and reserve it
    - Adding the TCR delta to CCR gives us TCR_threshold
    - If TCR < TCR_threshold, the trove may not be closeable as the delta would cause TCR < CCR
    - The graph shows amount of debt that can be minted at MCR while still allowing higher ICR troves to withdraw
    - In other words, it shows how much leverage needs to be reserved while still allowing MCR borrowing
    """
    )
    return


@app.cell
def _(px, threshold_df):
    px.scatter(
        threshold_df,
        x="TCR_threshold",
        y="MCR_debt_cap_reserve",
        color="troveManager",

    )
    return


@app.cell
def _():
    rates = [
          {
            "id": "0:0",
            "rate": "0",
            "totalDebt": "0"
          },
          {
            "id": "0:5000000000000000",
            "rate": "5000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "0:7000000000000000",
            "rate": "7000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "1:0",
            "rate": "0",
            "totalDebt": "0"
          },
          {
            "id": "1:10000000000000000",
            "rate": "10000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "1:14000000000000000",
            "rate": "14000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "1:15000000000000000",
            "rate": "15000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "1:16000000000000000",
            "rate": "16000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "1:17000000000000000",
            "rate": "17000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "1:18000000000000000",
            "rate": "18000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "1:20000000000000000",
            "rate": "20000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "1:5000000000000000",
            "rate": "5000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "2:0",
            "rate": "0",
            "totalDebt": "0"
          },
          {
            "id": "2:5000000000000000",
            "rate": "5000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "2:6000000000000000",
            "rate": "6000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "3:0",
            "rate": "0",
            "totalDebt": "0"
          },
          {
            "id": "3:10000000000000000",
            "rate": "10000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "3:16000000000000000",
            "rate": "16000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "3:17000000000000000",
            "rate": "17000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "3:18000000000000000",
            "rate": "18000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "3:19000000000000000",
            "rate": "19000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "3:20000000000000000",
            "rate": "20000000000000000",
            "totalDebt": "1868319483471778265791871"
          },
          {
            "id": "3:5000000000000000",
            "rate": "5000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "3:6000000000000000",
            "rate": "6000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "4:0",
            "rate": "0",
            "totalDebt": "0"
          },
          {
            "id": "4:6000000000000000",
            "rate": "6000000000000000",
            "totalDebt": "0"
          },
          {
            "id": "5:0",
            "rate": "0",
            "totalDebt": "0"
          }
        ]
    return (rates,)


@app.cell
def _(rates):
    sum([int(r["totalDebt"]) for r in rates if r["id"][0] == "3"]) / 10**18
    return


@app.cell
def _():
    return


if __name__ == "__main__":
    app.run()
