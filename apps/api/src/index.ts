import { createServer } from "./server.ts";

const PORT = Number.parseInt(process.env.PORT ?? "3001", 10);

const app = createServer();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`api server listening on http://localhost:${PORT}`);
});

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("unhandledRejection:", reason);
});

process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("uncaughtException:", err);
  process.exit(1);
});
