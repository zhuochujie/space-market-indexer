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

export type MarketTradeAction =
  | "active_buy"
  | "passive_buy"
  | "active_sell"
  | "passive_sell";

export const getAccountTradeAction = (
  trade: typeof schema.marketTrade.$inferSelect,
  account: `0x${string}`,
): MarketTradeAction => {
  if (trade.taker === account && trade.side === "sell") {
    return "active_buy";
  }

  if (trade.maker === account && trade.side === "buy") {
    return "passive_buy";
  }

  if (trade.taker === account && trade.side === "buy") {
    return "active_sell";
  }

  return "passive_sell";
};

export const serializeAccountTrade = (
  trade: typeof schema.marketTrade.$inferSelect,
  account: `0x${string}`,
) => ({
  ...serializeTrade(trade),
  action: getAccountTradeAction(trade, account),
  counterparty: trade.maker === account ? trade.taker : trade.maker,
});
