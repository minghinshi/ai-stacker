import express, { type Express } from "express";
import { generateRouter } from "./routes/generate.ts";
import { healthRouter } from "./routes/health.ts";

const WEB_ORIGIN = "http://localhost:5173";

export function createServer(): Express {
  const app = express();

  app.use(express.json());

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin === WEB_ORIGIN) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use("/api", healthRouter);
  app.use("/api", generateRouter);

  return app;
}
