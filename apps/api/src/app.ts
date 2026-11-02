import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { customersRouter } from "./customers.js";
import { NotFoundError } from "./errors.js";
import { ordersRouter } from "./orders.js";

export const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});
app.use("/api/customers", customersRouter);
app.use("/api/orders", ordersRouter);

const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof NotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: "Invalid request.",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (
    typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "P2025"
  ) {
    response.status(404).json({ error: "Record not found." });
    return;
  }

  if (
    typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "P2002"
  ) {
    response.status(409).json({ error: "A record with those values already exists." });
    return;
  }

  console.error("Unhandled API error:", error);
  response.status(500).json({ error: "The request could not be completed." });
};

app.use(errorHandler);
