import type { RequestHandler } from "express";

export const allowlistMiddleware: RequestHandler = (_req, _res, next) => {
  next();
};
