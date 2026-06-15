import schema from "ponder:schema";

export const serializeOrder = (order: typeof schema.order.$inferSelect) => ({
  id: order.id,
  maker: order.maker,
  side: order.side,
  spaceAmount: order.spaceAmount.toString(),
  remainingSpaceAmount: order.remainingSpaceAmount.toString(),
  price: order.price.toString(),
  status: order.status,
  visible: order.visible,
  transactionHash: order.transactionHash,
  logIndex: order.logIndex,
  createdAt: order.createdAt,
});

export const serializeTrade = (
  trade: typeof schema.marketTrade.$inferSelect,
) => ({
  id: trade.id,
  orderId: trade.orderId,
  maker: trade.maker,
  taker: trade.taker,
  side: trade.side,
  spaceAmount: trade.spaceAmount.toString(),
  price: trade.price.toString(),
  usdtAmount: trade.usdtAmount.toString(),
  nodeFee: trade.nodeFee.toString(),
  markerFee: trade.markerFee.toString(),
  transactionHash: trade.transactionHash,
  logIndex: trade.logIndex,
  filledAt: trade.filledAt,
});
