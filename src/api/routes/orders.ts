import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { and, asc, desc, eq, gte, sql } from "ponder";
import type { SQL } from "drizzle-orm";
import { serializeOrder } from "../serializers";
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
  validateParam,
  validateQuery,
} from "../utils";

const minRemainingSpaceAmount = 1_000_000_000_000_000_000n;

const openOrdersQuerySchema = paginationQuerySchema.extend({
  side: orderSideSchema.optional(),
});
const myOpenOrdersQuerySchema = openOrdersQuerySchema.extend({
  maker: hexSchema,
});
const myOrdersQuerySchema = paginationQuerySchema.extend({
  maker: hexSchema,
  side: orderSideSchema.optional(),
  status: orderStatusSchema.optional(),
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
      gte(schema.order.remainingSpaceAmount, minRemainingSpaceAmount),
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
  "/orders/mine/open",
  validateQuery(myOpenOrdersQuerySchema),
  async (c) => {
    const { maker, page, pageSize, side } = c.req.valid("query");

    const conditions: SQL[] = [
      eq(schema.order.maker, maker),
      eq(schema.order.status, "open"),
    ];

    if (side !== undefined) {
      conditions.push(eq(schema.order.side, side));
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
