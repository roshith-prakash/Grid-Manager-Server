import { NextFunction, Request, Response } from "express";
import { prisma } from "../utils/primsaClient.ts";

export const checkIfUserIsAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req?.body?.userId) {
    res
      .status(401)
      .send({ data: "User Id not present. User unauthenticated." });
    return;
  }

  // Check if user exists in the DB
  const user = await prisma.user.findUnique({
    where: {
      id: req?.body?.userId,
    },
    select: {
      id: true,
    },
  });

  // If user is present, access the controller
  if (user) {
    next();
  }
  // If user is not present, return unauthorized error.
  else {
    res.status(401).send({ data: "User is unauthenticated." });
    return;
  }
};
