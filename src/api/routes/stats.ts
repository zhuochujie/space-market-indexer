import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { and, desc, eq, gte, sql } from "ponder";
import { ok, SECONDS_PER_DAY, toBigInt } from "../utils";

export const statsRoutes = new Hono();

const secondsPerHour = 60 * 60;
const chinaTimezoneOffset = 8 * secondsPerHour;

const getTodayStartTimestamp = () => {
  const chinaNow = new Date(Date.now() + chinaTimezoneOffset * 1000);

  return (
    Date.UTC(
      chinaNow.getUTCFullYear(),
      chinaNow.getUTCMonth(),
      chinaNow.getUTCDate(),
    ) /
      1000 -
    chinaTimezoneOffset
  );
};

statsRoutes.get("/stats/prices", async (c) => {
  const now = Math.floor(Date.now() / 1000);
  const from = now - SECONDS_PER_DAY;

  const [row] = await db
    .select({
      tradeCount: sql<string>`count(*)`,
      totalSpaceAmount: sql<string>`coalesce(sum(${schema.marketTrade.spaceAmount}), 0)`,
      weightedPriceSum: sql<string>`coalesce(sum(${schema.marketTrade.price} * ${schema.marketTrade.spaceAmount}), 0)`,
    })
    .from(schema.marketTrade)
    .where(gte(schema.marketTrade.filledAt, from));

  const tradeCount = Number(row?.tradeCount ?? 0);
  const totalSpaceAmount = toBigInt(row?.totalSpaceAmount);
  const weightedPriceSum = toBigInt(row?.weightedPriceSum);
  const averagePrice =
    totalSpaceAmount === 0n ? 0n : weightedPriceSum / totalSpaceAmount;
  const [trade] = await db
    .select({
      price: schema.marketTrade.price,
      logIndex: schema.marketTrade.logIndex,
      filledAt: schema.marketTrade.filledAt,
    })
    .from(schema.marketTrade)
    .orderBy(desc(schema.marketTrade.filledAt), desc(schema.marketTrade.logIndex))
    .limit(1);

  return ok(c, {
    averagePrice24h: averagePrice.toString(),
    latestPrice: trade?.price.toString() ?? null,
    tradeCount24h: tradeCount,
    totalSpaceAmount24h: totalSpaceAmount.toString(),
    from,
    to: now,
  });
});

statsRoutes.get("/stats/market-open-space", async (c) => {
  const [row] = await db
    .select({
      buySpaceAmount: sql<string>`coalesce(sum(case when ${schema.order.side} = 'buy' then ${schema.order.remainingSpaceAmount} else 0 end), 0)`,
      sellSpaceAmount: sql<string>`coalesce(sum(case when ${schema.order.side} = 'sell' then ${schema.order.remainingSpaceAmount} else 0 end), 0)`,
    })
    .from(schema.order)
    .where(and(eq(schema.order.status, "open"), eq(schema.order.visible, true)));

  return ok(c, {
    buySpaceAmount: toBigInt(row?.buySpaceAmount).toString(),
    sellSpaceAmount: toBigInt(row?.sellSpaceAmount).toString(),
  });
});

statsRoutes.get("/stats/today-market-trades", async (c) => {
  const from = getTodayStartTimestamp();
  const to = Math.floor(Date.now() / 1000);

  const [row] = await db
    .select({
      tradeCount: sql<string>`count(*)`,
      totalSpaceAmount: sql<string>`coalesce(sum(${schema.marketTrade.spaceAmount}), 0)`,
      totalUsdtAmount: sql<string>`coalesce(sum(${schema.marketTrade.usdtAmount}), 0)`,
    })
    .from(schema.marketTrade)
    .where(gte(schema.marketTrade.filledAt, from));

  return ok(c, {
    tradeCount: Number(row?.tradeCount ?? 0),
    totalSpaceAmount: toBigInt(row?.totalSpaceAmount).toString(),
    totalUsdtAmount: toBigInt(row?.totalUsdtAmount).toString(),
    from,
    to,
  });
});
