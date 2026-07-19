import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { and, desc, eq, or, sql } from "ponder";
import type { SQL } from "drizzle-orm";
import { serializeAccountTrade, serializeTrade } from "../serializers";
import {
  getPaginationOffset,
  hexSchema,
  marketTradeActionSchema,
  ok,
  orderSideSchema,
  paginationQuerySchema,
  toCount,
  transactionHashParamSchema,
  validateParam,
  validateQuery,
} from "../utils";

const accountTradesQuerySchema = paginationQuerySchema.extend({
  account: hexSchema,
  action: marketTradeActionSchema.optional(),
  side: orderSideSchema.optional(),
});

export const tradeRoutes = new Hono();

tradeRoutes.get(
  "/trades/by-transaction/:transactionHash",
  validateParam(transactionHashParamSchema),
  async (c) => {
    const { transactionHash } = c.req.valid("param");

    const rows = await db
      .select()
      .from(schema.marketTrade)
      .where(eq(schema.marketTrade.transactionHash, transactionHash))
      .orderBy(desc(schema.marketTrade.logIndex));

    return ok(c, {
      items: rows.map(serializeTrade),
    });
  },
);

tradeRoutes.get(
  "/trades/recent",
  validateQuery(paginationQuerySchema),
  async (c) => {
    const { page, pageSize } = c.req.valid("query");

    const [totalRow] = await db
      .select({ total: sql<string>`count(*)` })
      .from(schema.marketTrade);

    const rows = await db
      .select()
      .from(schema.marketTrade)
      .orderBy(desc(schema.marketTrade.filledAt), desc(schema.marketTrade.id))
      .limit(pageSize)
      .offset(getPaginationOffset({ page, pageSize }));

    return ok(c, {
      items: rows.map(serializeTrade),
      total: toCount(totalRow?.total),
      page,
      pageSize,
    });
  },
);

tradeRoutes.get(
  "/trades/account/stats",
  validateQuery(accountTradesQuerySchema.pick({ account: true })),
  async (c) => {
    const { account } = c.req.valid("query");

    const [row] = await db
      .select({
        buySpaceAmount: sql<string>`coalesce(sum(case when ((${schema.marketTrade.taker} = ${account} and ${schema.marketTrade.side} = 'sell') or (${schema.marketTrade.maker} = ${account} and ${schema.marketTrade.side} = 'buy')) then ${schema.marketTrade.spaceAmount} else 0 end), 0)`,
        sellSpaceAmount: sql<string>`coalesce(sum(case when ((${schema.marketTrade.taker} = ${account} and ${schema.marketTrade.side} = 'buy') or (${schema.marketTrade.maker} = ${account} and ${schema.marketTrade.side} = 'sell')) then ${schema.marketTrade.spaceAmount} else 0 end), 0)`,
      })
      .from(schema.marketTrade)
      .where(
        or(
          eq(schema.marketTrade.maker, account),
          eq(schema.marketTrade.taker, account),
        ),
      );

    return ok(c, {
      buySpaceAmount: row?.buySpaceAmount ?? "0",
      sellSpaceAmount: row?.sellSpaceAmount ?? "0",
    });
  },
);

tradeRoutes.get(
  "/trades/account",
  validateQuery(accountTradesQuerySchema),
  async (c) => {
    const { account, action, page, pageSize, side } = c.req.valid("query");

    const actionConditions: Record<NonNullable<typeof action>, SQL[]> = {
      active_buy: [
        eq(schema.marketTrade.taker, account),
        eq(schema.marketTrade.side, "sell"),
      ],
      passive_buy: [
        eq(schema.marketTrade.maker, account),
        eq(schema.marketTrade.side, "buy"),
      ],
      active_sell: [
        eq(schema.marketTrade.taker, account),
        eq(schema.marketTrade.side, "buy"),
      ],
      passive_sell: [
        eq(schema.marketTrade.maker, account),
        eq(schema.marketTrade.side, "sell"),
      ],
    };

    const conditions: SQL[] =
      action === undefined
        ? [
            or(
              eq(schema.marketTrade.maker, account),
              eq(schema.marketTrade.taker, account),
            )!,
          ]
        : actionConditions[action];

    if (side !== undefined) {
      conditions.push(eq(schema.marketTrade.side, side));
    }

    const where = and(...conditions);
    const [totalRow] = await db
      .select({ total: sql<string>`count(*)` })
      .from(schema.marketTrade)
      .where(where);

    const rows = await db
      .select()
      .from(schema.marketTrade)
      .where(where)
      .orderBy(desc(schema.marketTrade.filledAt), desc(schema.marketTrade.id))
      .limit(pageSize)
      .offset(getPaginationOffset({ page, pageSize }));

    return ok(c, {
      items: rows.map((trade) => serializeAccountTrade(trade, account)),
      total: toCount(totalRow?.total),
      page,
      pageSize,
    });
  },
);
