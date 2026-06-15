import { createConfig } from "ponder";
import { TokenExchangeAbi } from "./abis/TokenExchangeAbi";

export default createConfig({
  database: {
    kind: "postgres",
    connectionString: process.env.DATABASE_URL!,
    poolConfig: {
      max: 30,
    },
  },
  chains: {
    bsc: {
      id: Number(process.env.PONDER_CHAIN_ID),
      rpc: process.env.PONDER_RPC_URL,
      ws: process.env.PONDER_WS_URL,
    },
  },
  contracts: {
    TokenExchange: {
      chain: "bsc",
      abi: TokenExchangeAbi,
      address: process.env.TOKEN_EXCHANGE_ADDRESS as `0x${string}`,
      startBlock: Number(process.env.START_BLOCK),
    },
  },
});
