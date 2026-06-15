import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { and, desc, eq, sql } from "ponder";
import type { SQL } from "drizzle-orm";
import { serializeTrade } from "../serializers";
import {
  getPaginationOffset,
  hexSchema,
  ok,
  orderSideSchema,
  paginationQuerySchema,
  toCount,
  transactionHashParamSchema,
  validateParam,
  validateQuery,
} from "../utils";

const myTradesQuerySchema = paginationQuerySchema.extend({
  taker: hexSchema,
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
  "/trades/mine",
  validateQuery(myTradesQuerySchema),
  async (c) => {
    const { page, pageSize, side, taker } = c.req.valid("query");

    const conditions: SQL[] = [eq(schema.marketTrade.taker, taker)];

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
      list: rows.map(serializeTrade),
      total: toCount(totalRow?.total),
      page,
      pageSize,
    });
  },
);
