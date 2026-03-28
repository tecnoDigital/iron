import type { ErrorRequestHandler } from "express";

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  res.status(500).json({ error: "internal_error", message: err.message });
};
