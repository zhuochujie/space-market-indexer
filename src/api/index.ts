import { Hono } from "hono";
import { orderRoutes } from "./routes/orders";
import { statsRoutes } from "./routes/stats";
import { tradeRoutes } from "./routes/trades";
import { fail } from "./utils";

const app = new Hono();

// app.use("/sql/*", client({ db, schema }));

app.route("/", statsRoutes);
app.route("/", orderRoutes);
app.route("/", tradeRoutes);

app.notFound((c) => fail(c, 404, "NOT_FOUND"));

app.onError((error, c) => {
  console.error(error);
  return fail(c, 500, "INTERNAL_SERVER_ERROR");
});

// app.use("/", graphql({ db, schema }));
// app.use("/graphql", graphql({ db, schema }));

export default app;
