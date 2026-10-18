import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { and, asc, desc, eq, inArray, sql } from "ponder";
import type { SQL } from "drizzle-orm";
import { z } from "zod";
import { serializeOrder, serializeTrade } from "../serializers";
import {
  getPaginationOffset,
  hexSchema,
  idParamSchema,
  fail,
  ok,
  orderSideSchema,
  orderStatusSchema,
  paginationQuerySchema,
  toCount,
  transactionHashParamSchema,
  validateJson,
  validateParam,
  validateQuery,
} from "../utils";

const openOrdersQuerySchema = paginationQuerySchema.extend({
  side: orderSideSchema.optional(),
});
const myOrdersQuerySchema = paginationQuerySchema.extend({
  maker: hexSchema,
  side: orderSideSchema.optional(),
  status: orderStatusSchema.optional(),
});
const teamOpenOrdersBodySchema = paginationQuerySchema.extend({
  makers: z.array(hexSchema).min(1).max(50_000),
  side: orderSideSchema,
});

export const orderRoutes = new Hono();

const countOrders = async (where: SQL | undefined) => {
  const [row] = await db
    .select({ total: sql<string>`count(*)` })
    .from(schema.order)
    .where(where);

  return toCount(row?.total);
};

orderRoutes.get(
  "/orders/open",
  validateQuery(openOrdersQuerySchema),
  async (c) => {
    const { page, pageSize, side } = c.req.valid("query");

    const conditions: SQL[] = [
      eq(schema.order.status, "open"),
      eq(schema.order.visible, true),
    ];

    if (side !== undefined) {
      conditions.push(eq(schema.order.side, side));
    }

    const orderBy =
      side === "sell"
        ? [asc(schema.order.price), asc(schema.order.createdAt)]
        : side === "buy"
          ? [desc(schema.order.price), asc(schema.order.createdAt)]
          : [desc(schema.order.createdAt)];

    const where = and(...conditions);
    const total = await countOrders(where);
    const rows = await db
      .select()
      .from(schema.order)
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(getPaginationOffset({ page, pageSize }));

    return ok(c, {
      items: rows.map(serializeOrder),
      total,
      page,
      pageSize,
    });
  },
);

orderRoutes.post(
  "/orders/open/by-makers",
  validateJson(teamOpenOrdersBodySchema),
  async (c) => {
    const internalApiKey = process.env.MARKET_INDEXER_INTERNAL_API_KEY?.trim();
    if (!internalApiKey) {
      return fail(c, 503, "INTERNAL_API_NOT_CONFIGURED");
    }
    if (c.req.header("x-market-indexer-key") !== internalApiKey) {
      return fail(c, 401, "UNAUTHORIZED");
    }

    const { makers, page, pageSize, side } = c.req.valid("json");
    const normalizedMakers = Array.from(
      new Set(makers.map((maker) => maker.toLowerCase() as `0x${string}`)),
    );
    const where = and(
      inArray(schema.order.maker, normalizedMakers),
      eq(schema.order.status, "open"),
      eq(schema.order.visible, true),
      eq(schema.order.side, side),
    );
    const orderBy =
      side === "sell"
        ? [asc(schema.order.price), asc(schema.order.createdAt)]
        : [desc(schema.order.price), asc(schema.order.createdAt)];

    const total = await countOrders(where);
    const rows = await db
      .select()
      .from(schema.order)
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(getPaginationOffset({ page, pageSize }));

    return ok(c, {
      items: rows.map(serializeOrder),
      total,
      page,
      pageSize,
    });
  },
);

orderRoutes.get(
  "/orders/by-transaction/:transactionHash",
  validateParam(transactionHashParamSchema),
  async (c) => {
    const { transactionHash } = c.req.valid("param");

    const rows = await db
      .select()
      .from(schema.order)
      .where(eq(schema.order.transactionHash, transactionHash))
      .orderBy(asc(schema.order.logIndex));

    return ok(c, {
      items: rows.map(serializeOrder),
    });
  },
);

orderRoutes.get(
  "/orders/recent",
  validateQuery(paginationQuerySchema),
  async (c) => {
    const { page, pageSize } = c.req.valid("query");

    const total = await countOrders(undefined);
    const rows = await db
      .select()
      .from(schema.order)
      .orderBy(desc(schema.order.createdAt), desc(schema.order.id))
      .limit(pageSize)
      .offset(getPaginationOffset({ page, pageSize }));

    return ok(c, {
      items: rows.map(serializeOrder),
      total,
      page,
      pageSize,
    });
  },
);

orderRoutes.get(
  "/orders/mine",
  validateQuery(myOrdersQuerySchema),
  async (c) => {
    const { maker, page, pageSize, side, status } = c.req.valid("query");

    const conditions: SQL[] = [eq(schema.order.maker, maker)];

    if (side !== undefined) {
      conditions.push(eq(schema.order.side, side));
    }
    if (status !== undefined) {
      conditions.push(eq(schema.order.status, status));
    }

    const where = and(...conditions);
    const total = await countOrders(where);
    const rows = await db
      .select()
      .from(schema.order)
      .where(where)
      .orderBy(desc(schema.order.createdAt))
      .limit(pageSize)
      .offset(getPaginationOffset({ page, pageSize }));

    return ok(c, {
      items: rows.map(serializeOrder),
      total,
      page,
      pageSize,
    });
  },
);

orderRoutes.get("/orders/:id/detail", validateParam(idParamSchema), async (c) => {
  const { id } = c.req.valid("param");

  const [order] = await db
    .select()
    .from(schema.order)
    .where(eq(schema.order.id, id))
    .limit(1);

  if (order === undefined) {
    return fail(c, 404, "ORDER_NOT_FOUND");
  }

  const trades = await db
    .select()
    .from(schema.marketTrade)
    .where(eq(schema.marketTrade.orderId, id))
    .orderBy(desc(schema.marketTrade.filledAt), desc(schema.marketTrade.id));

  return ok(c, {
    order: serializeOrder(order),
    trades: trades.map(serializeTrade),
  });
});

orderRoutes.get("/orders/:id", validateParam(idParamSchema), async (c) => {
  const { id } = c.req.valid("param");

  const [order] = await db
    .select()
    .from(schema.order)
    .where(eq(schema.order.id, id))
    .limit(1);

  if (order === undefined) {
    return fail(c, 404, "ORDER_NOT_FOUND");
  }

  return ok(c, serializeOrder(order));
});
