import { prisma } from "../utils/primsaClient.ts";
import { Request, Response } from "express";

// Find Notices
export const getNotices = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const notices = await prisma.notice.findMany({
      orderBy: {
        createdAt: "desc",
      },
      skip: req?.body?.page * 4,
      take: 4,
    });

    // Check if next page exists.
    const nextPage = await prisma.notice.count({
      orderBy: {
        createdAt: "desc",
      },
      skip: req?.body?.page * 4,
      take: 4,
    });

    // Return the notices
    res.status(200).send({
      notices: notices,
      nextPage: nextPage != 0 ? req?.body?.page + 1 : null,
    });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};
