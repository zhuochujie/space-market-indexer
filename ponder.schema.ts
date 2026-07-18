import { index, onchainEnum, onchainTable } from "ponder";

export const orderSide = onchainEnum("order_side", ["buy", "sell"]);
export const orderStatus = onchainEnum("order_status", [
  "open",
  "filled",
  "cancelled",
]);

export const order = onchainTable(
  "order",
  (t) => ({
    id: t.hex().primaryKey(),
    maker: t.hex().notNull(),
    side: orderSide().notNull(),
    spaceAmount: t.bigint().notNull(),
    remainingSpaceAmount: t.bigint().notNull(),
    price: t.bigint().notNull(),
    status: orderStatus().notNull(),
    visible: t.boolean().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    createdAt: t.integer().notNull(),
  }),
  (table) => ({
    makerStatusCreatedAtIdx: index("order_maker_status_created_at_idx").on(
      table.maker,
      table.status,
      table.createdAt,
    ),
    sideStatusVisibleIdx: index("order_side_status_visible_idx").on(
      table.side,
      table.status,
      table.visible,
    ),
  }),
);

export const marketTrade = onchainTable(
  "market_trade",
  (t) => ({
    id: t.text().primaryKey(),
    orderId: t.hex().notNull(),
    maker: t.hex().notNull(),
    taker: t.hex().notNull(),
    side: orderSide().notNull(),
    spaceAmount: t.bigint().notNull(),
    price: t.bigint().notNull(),
    usdtAmount: t.bigint().notNull(),
    nodeFee: t.bigint().notNull(),
    markerFee: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    filledAt: t.integer().notNull(),
  }),
  (table) => ({
    filledAtIdx: index("market_trade_filled_at_idx").on(table.filledAt),
    makerFilledAtIdx: index("market_trade_maker_filled_at_idx").on(
      table.maker,
      table.filledAt,
    ),
    takerFilledAtIdx: index("market_trade_taker_filled_at_idx").on(
      table.taker,
      table.filledAt,
    ),
    orderIdFilledAtIdx: index("market_trade_order_id_filled_at_idx").on(
      table.orderId,
      table.filledAt,
    ),
  }),
);
