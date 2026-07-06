import { NextFunction, Request, Response } from "express";

export const verifyAdminSecret = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const adminSecret = process.env.ADMIN_SECRET;
  const providedSecret = req.headers["x-admin-secret"];

  if (!adminSecret) {
    console.error("ADMIN_SECRET is not configured on the server.");
    res.status(500).send({ data: "Server configuration error." });
    return;
  }

  if (!providedSecret || providedSecret !== adminSecret) {
    res.status(401).send({ data: "Unauthorized access to admin endpoint." });
    return;
  }

  next();
};
