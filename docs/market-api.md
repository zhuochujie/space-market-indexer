# API 文档

基础地址：

```text
http://localhost:42069
```

所有接口都返回 JSON。链上 `uint256` 对应的大整数会以字符串返回，避免 JavaScript 数字精度丢失。

## 统一响应格式

成功响应：

```json
{
  "success": true,
  "code": 200,
  "data": {},
  "message": "Success",
  "timestamp": 1710000000000
}
```

失败响应：

```json
{
  "success": false,
  "code": 400,
  "message": "VALIDATION_ERROR",
  "timestamp": 1710000000000,
  "path": "/api/path"
}
```

下文每个接口的“返回示例”都展示 `data` 内部的业务数据结构。

## 通用类型

### Order

订单，也就是挂单记录。

```ts
{
  id: string;
  maker: string;
  side: "buy" | "sell";
  spaceAmount: string;
  remainingSpaceAmount: string;
  price: string;
  status: "open" | "filled" | "cancelled";
  visible: boolean;
  transactionHash: string;
  logIndex: number;
  createdAt: number;
}
```

### MarketTrade

成交记录，也就是吃单记录。

```ts
{
  id: string;
  orderId: string;
  maker: string;
  taker: string;
  side: "buy" | "sell";
  spaceAmount: string;
  price: string;
  usdtAmount: string;
  nodeFee: string;
  markerFee: string;
  transactionHash: string;
  logIndex: number;
  filledAt: number;
}
```

### 分页参数

分页接口支持：

```text
page     默认 1，最小值 1
pageSize 默认 50，最小值 1，最大值 500
```

## 行情统计

### 查询价格信息

查询最新成交价和 24 小时成交量加权平均价。

```http
GET /stats/prices
```

`data` 示例：

```json
{
  "averagePrice24h": "123456",
  "latestPrice": "123999",
  "tradeCount24h": 12,
  "totalSpaceAmount24h": "1000000000000000000",
  "from": 1710000000,
  "to": 1710086400
}
```

说明：

- `averagePrice24h = sum(price * spaceAmount) / sum(spaceAmount)`。
- 没有成交记录时，`latestPrice` 返回 `null`。
- 价格字段保持合约事件里的原始整数精度，前端展示时需要按业务精度格式化。

### 查询当前 SPACE 挂单量

查询当前买单和卖单的 SPACE 挂单量。

```http
GET /stats/market-open-space
```

统计口径：

```text
status = open
visible = true
按 side 分别汇总 remainingSpaceAmount
```

`data` 示例：

```json
{
  "buySpaceAmount": "1000000000000000000",
  "sellSpaceAmount": "2000000000000000000"
}
```

### 查询今日成交量和成交额

查询北京时间今日 00:00:00 至当前时间的成交量和成交额。

```http
GET /stats/today-market-trades
```

统计口径：

```text
totalSpaceAmount = sum(spaceAmount)
totalUsdtAmount = sum(usdtAmount)
```

`data` 示例：

```json
{
  "tradeCount": 12,
  "totalSpaceAmount": "1000000000000000000",
  "totalUsdtAmount": "123456000000000000000000",
  "from": 1710000000,
  "to": 1710086400
}
```

## 订单接口

### 查询当前挂单

查询当前可见、未成交完成，并且剩余数量满足最低要求的挂单。

```http
GET /orders/open
```

固定查询条件：

```text
status = open
visible = true
remainingSpaceAmount >= 1000000000000000000
```

查询参数：

```text
page      可选
pageSize  可选
side      可选，buy | sell
```

排序：

```text
price DESC
createdAt ASC
```

请求示例：

```bash
curl "http://localhost:42069/orders/open?page=1&pageSize=20&side=buy"
```

`data` 示例：

```json
{
  "items": [
    {
      "id": "0x...",
      "maker": "0x...",
      "side": "buy",
      "spaceAmount": "1000000000000000000",
      "remainingSpaceAmount": "1000000000000000000",
      "price": "123456",
      "status": "open",
      "visible": true,
      "transactionHash": "0x...",
      "logIndex": 12,
      "createdAt": 1710000000
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

### 根据交易哈希查询订单

根据创建订单的交易哈希查询订单列表。

```http
GET /orders/by-transaction/:transactionHash
```

请求示例：

```bash
curl "http://localhost:42069/orders/by-transaction/0x..."
```

`data` 示例：

```json
{
  "items": []
}
```

### 查询我的当前挂单

查询指定 maker 地址创建的当前挂单。

```http
GET /orders/mine/open
```

查询参数：

```text
maker     必填，0x...
page      可选
pageSize  可选
side      可选，buy | sell
```

排序：

```text
createdAt DESC
```

请求示例：

```bash
curl "http://localhost:42069/orders/mine/open?maker=0x...&page=1&pageSize=20&side=sell"
```

`data` 示例：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

### 查询我的订单

查询指定 maker 地址创建的订单，可按方向和状态过滤。

```http
GET /orders/mine
```

查询参数：

```text
maker     必填，0x...
page      可选
pageSize  可选
side      可选，buy | sell
status    可选，open | filled | cancelled
```

排序：

```text
createdAt DESC
```

请求示例：

```bash
curl "http://localhost:42069/orders/mine?maker=0x...&status=open&page=1&pageSize=20"
```

`data` 示例：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

### 查询订单详情

根据订单 ID 查询单个订单。

```http
GET /orders/:id
```

请求示例：

```bash
curl "http://localhost:42069/orders/0x..."
```

`data` 示例：

```json
{
  "id": "0x...",
  "maker": "0x...",
  "side": "buy",
  "spaceAmount": "1000000000000000000",
  "remainingSpaceAmount": "1000000000000000000",
  "price": "123456",
  "status": "open",
  "visible": true,
  "transactionHash": "0x...",
  "logIndex": 12,
  "createdAt": 1710000000
}
```

订单不存在时返回失败响应：

```json
{
  "success": false,
  "code": 404,
  "message": "ORDER_NOT_FOUND",
  "timestamp": 1710000000000,
  "path": "/orders/0x..."
}
```

HTTP 状态码：`404`。

## 成交接口

### 根据交易哈希查询成交记录

根据交易哈希查询该交易产生的成交记录。

```http
GET /trades/by-transaction/:transactionHash
```

请求示例：

```bash
curl "http://localhost:42069/trades/by-transaction/0x..."
```

`data` 示例：

```json
{
  "items": []
}
```

### 查询我的成交记录

查询指定 taker 地址作为吃单方的成交记录。

```http
GET /trades/mine
```

查询参数：

```text
taker     必填，0x...
page      可选
pageSize  可选
side      可选，buy | sell
```

排序：

```text
filledAt DESC
id DESC
```

请求示例：

```bash
curl "http://localhost:42069/trades/mine?taker=0x...&page=1&pageSize=20&side=buy"
```

`data` 示例：

```json
{
  "list": [
    {
      "id": "0x...-12",
      "orderId": "0x...",
      "maker": "0x...",
      "taker": "0x...",
      "side": "buy",
      "spaceAmount": "1000000000000000000",
      "price": "123456",
      "usdtAmount": "123456000000000000000000",
      "nodeFee": "0",
      "markerFee": "0",
      "transactionHash": "0x...",
      "logIndex": 12,
      "filledAt": 1710000000
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

## 参数校验

接口使用 `zod` 进行参数校验。路径参数或查询参数不合法时，会返回 `400`，`message` 为 `VALIDATION_ERROR`。

通用校验规则：

```text
hex 参数必须匹配 0x[0-9a-fA-F]+
side 必须是 buy 或 sell
status 必须是 open、filled 或 cancelled
page 必须是大于等于 1 的整数
pageSize 必须是 1 到 500 之间的整数
```

其他通用错误：

```text
NOT_FOUND              路由不存在
INTERNAL_SERVER_ERROR  服务内部错误
ORDER_NOT_FOUND        订单不存在
```
