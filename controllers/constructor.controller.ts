import { prisma } from "../utils/primsaClient.ts";
import { Request, Response } from "express";
import { generateLeagueUID } from "../utils/generateLeagueUID.ts";
import { Constructor, Driver } from "@prisma/client";
import {
  changeCost,
  numberOfPossibleLeagues,
  numberOfPossibleTeamsInALeague,
} from "../constants/DatabaseConstants.ts";
import { countNumberOfChanges } from "../utils/countNumberOfChanges.ts";
import { isValidName } from "../utils/validateName.ts";
import { redisClient } from "../utils/redis.ts";

export const getConstructors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Do not add "where" - constructor keyword causes errors
    const cachedConstructors = await redisClient.get('cache:constructors');
    if (cachedConstructors) {
      res.status(200).send({ constructors: JSON.parse(cachedConstructors) });
      return;
    }

    let constructors = await prisma.constructor.findMany({
      orderBy: {
        points: "desc",
      },
    });

    await redisClient.setEx('cache:constructors', 60 * 60 * 24, JSON.stringify(constructors));
    res.status(200).send({ constructors: constructors });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Get Driver statistics

export const getConstructorStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const constructorId = req?.body?.constructorId;
    const userId = req?.body?.userId;
    const teamId = req?.body?.teamId;

    let constructor = await prisma.constructor.findUnique({
      where: {
        constructorId: constructorId,
      },
    });

    if (!constructor) {
      res.status(404).send({ data: "Constructor not found." });
      return;
    }

    // If the driver is present in the team of the user
    if (teamId && userId) {
      // Find the driver in team
      let userConstructor = await prisma.constructorInTeam.findFirst({
        where: {
          constructorId: constructorId,
          teamId: teamId,
          Team: {
            userId: userId,
          },
        },
      });

      // If driver in team is found
      if (userConstructor) {
        // @ts-ignore
        constructor.pointsForTeam = userConstructor?.pointsForTeam;
        // @ts-ignore
        constructor.teamPointsHistory = userConstructor?.teamPointsHistory;
      }
    }

    res.status(200).send({ constructor: constructor });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// -------------------------------------------------------------------------------------------------------------------

// Team Functions

// Create a new Team

export const getMostSelectedConstructors = async (
  req: Request,
  res: Response
) => {
  try {
    const cachedMostSelectedConstructors = await redisClient.get('cache:mostSelectedConstructors');
    if (cachedMostSelectedConstructors) {
      res.status(200).send({ constructors: JSON.parse(cachedMostSelectedConstructors) });
      return;
    }

    const constructors = await prisma.constructor.findMany({
      orderBy: [{ chosenPercentage: "desc" }, { points: "desc" }],
      take: 3,
    });

    res.status(200).send({ constructors: constructors });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong" });
  }
};

// Find drivers - sorted by highest scoring

export const getHighestScoringConstructors = async (
  req: Request,
  res: Response
) => {
  try {
    const constructors = await prisma.constructor.findMany({
      orderBy: [{ points: "desc" }],
      take: 3,
    });

    res.status(200).send({ constructors: constructors });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong" });
  }
};

// Get the top 3 teams across all leagues

