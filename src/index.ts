import { ponder } from "ponder:registry";
import schema from "ponder:schema";

const toOrderSide = (side: number) => (side === 0 ? "buy" : "sell");
const toTimestamp = (timestamp: bigint) => Number(timestamp);
const getTradeId = (transactionHash: `0x${string}`, logIndex: number) =>
  `${transactionHash}-${logIndex}`;

ponder.on("TokenExchange:OrderPlaced", async ({ event, context }) => {
  const { orderId, maker, side, spaceAmount, price, visible } = event.args;

  await context.db
    .insert(schema.order)
    .values({
      id: orderId,
      maker,
      side: toOrderSide(side),
      spaceAmount,
      remainingSpaceAmount: spaceAmount,
      price,
      status: "open",
      visible,
      transactionHash: event.transaction.hash,
      logIndex: event.log.logIndex,
      createdAt: toTimestamp(event.block.timestamp),
    })
    .onConflictDoNothing();
});

ponder.on("TokenExchange:OrderFilled", async ({ event, context }) => {
  const {
    orderId,
    maker,
    taker,
    spaceAmount,
    price,
    usdtAmount,
    nodeFee,
    markerFee,
  } = event.args;

  const order = await context.db.find(schema.order, { id: orderId });
  if (order === null) return;

  await context.db
    .insert(schema.marketTrade)
    .values({
      id: getTradeId(event.transaction.hash, event.log.logIndex),
      orderId,
      maker,
      taker,
      side: order.side,
      spaceAmount,
      price,
      usdtAmount,
      nodeFee,
      markerFee,
      transactionHash: event.transaction.hash,
      logIndex: event.log.logIndex,
      filledAt: toTimestamp(event.block.timestamp),
    })
    .onConflictDoNothing();

  const remainingSpaceAmount =
    order.remainingSpaceAmount > spaceAmount
      ? order.remainingSpaceAmount - spaceAmount
      : 0n;

  await context.db.update(schema.order, { id: orderId }).set({
    remainingSpaceAmount,
    status: remainingSpaceAmount === 0n ? "filled" : "open",
  });
});

ponder.on("TokenExchange:OrderCancelled", async ({ event, context }) => {
  const { orderId } = event.args;

  const order = await context.db.find(schema.order, { id: orderId });
  if (order === null) return;

  await context.db.update(schema.order, { id: orderId }).set({
    remainingSpaceAmount: 0n,
    status: "cancelled",
  });
});
