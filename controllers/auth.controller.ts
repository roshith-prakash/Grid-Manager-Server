import { prisma } from "../utils/primsaClient.ts";
import { Request, Response } from "express";

// Get Current User from DB
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get user info from request.
    const user = req.body?.user;

    // Get the user from DB
    const userInDB = await prisma.user.findUnique({
      where: {
        clerkID: user?.id,
      },
    });

    // If user not present in DB
    if (!userInDB) {
      res.status(404).send({ data: "User does not exist." });
      return;
    }

    res.status(200).send({ user: userInDB });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Get User information
export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get user info from request.
    const username = req.body?.username;

    // Get the user from DB
    const userInDB = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });

    // If user not present in DB
    if (!userInDB) {
      res.status(404).send({ data: "User does not exist." });
      return;
    }

    // sending user
    res.status(200).send({ user: userInDB });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};
