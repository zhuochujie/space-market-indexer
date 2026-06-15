import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";

export const SECONDS_PER_DAY = 24 * 60 * 60;

export const toBigInt = (value: unknown) => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  return 0n;
};

export const getPaginationOffset = ({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}) => (page - 1) * pageSize;

export const toCount = (value: unknown) => Number(toBigInt(value));

export const hexSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]+$/)
  .transform((value) => value as `0x${string}`);

export const orderSideSchema = z.enum(["buy", "sell"]);
export const orderStatusSchema = z.enum(["open", "filled", "cancelled"]);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export const idParamSchema = z.object({
  id: hexSchema,
});

export const transactionHashParamSchema = z.object({
  transactionHash: hexSchema,
});

export const ok = <T>(c: Context, data: T, message = "Success") =>
  c.json({
    success: true,
    code: 200,
    data,
    message,
    timestamp: Date.now(),
  });

export const fail = (c: Context, code: ContentfulStatusCode, message: string) =>
  c.json(
    {
      success: false,
      code,
      message,
      timestamp: Date.now(),
      path: c.req.path,
    },
    code,
  );

export const validateQuery = <T extends z.ZodTypeAny>(schema: T) =>
  zValidator("query", schema, (result, c) => {
    if (result.success === false) {
      return fail(c, 400, "VALIDATION_ERROR");
    }
  });

export const validateParam = <T extends z.ZodTypeAny>(schema: T) =>
  zValidator("param", schema, (result, c) => {
    if (result.success === false) {
      return fail(c, 400, "VALIDATION_ERROR");
    }
  });
