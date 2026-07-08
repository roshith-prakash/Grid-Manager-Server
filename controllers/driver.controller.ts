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

export const getDrivers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cachedDrivers = await redisClient.get('cache:drivers');
    if (cachedDrivers) {
      res.status(200).send({ drivers: JSON.parse(cachedDrivers) });
      return;
    }

    let drivers = await prisma.driver.findMany({
      select: {
        id: true,
        code: true,
        constructor_color: true,
        constructor_name: true,
        driverId: true,
        permanentNumber: true,
        points: true,
        price: true,
        image: true,
        familyName: true,
        givenName: true,
        isDriverDisabled: true,
      },
      orderBy: {
        points: "desc",
      },
    });

    await redisClient.setEx('cache:drivers', 60 * 60 * 24, JSON.stringify(drivers));
    res.status(200).send({ drivers: drivers });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Get Constructors based on Constructors Standings

export const getDriverStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const driverId = req?.body?.driverId;
    const userId = req?.body?.userId;
    const teamId = req?.body?.teamId;

    let driver = await prisma.driver.findUnique({
      where: {
        driverId: driverId,
      },
    });

    if (!driver) {
      res.status(404).send({ data: "Driver not found!" });
      return;
    }

    // If the driver is present in the team of the user
    if (teamId && userId) {
      // Find the driver in team
      let userDriver = await prisma.driverInTeam.findFirst({
        where: {
          driverId: driverId,
          teamId: teamId,
          Team: {
            userId: userId,
          },
        },
      });

      // If driver in team is found
      if (userDriver) {
        // @ts-ignore
        driver.pointsForTeam = userDriver?.pointsForTeam;
        // @ts-ignore
        driver.teamPointsHistory = userDriver?.teamPointsHistory;
      }
    }

    res.status(200).send({ driver: driver });

    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Get Driver statistics

export const getMostSelectedDrivers = async (req: Request, res: Response) => {
  try {
    const cachedMostSelectedDrivers = await redisClient.get('cache:mostSelectedDrivers');
    if (cachedMostSelectedDrivers) {
      res.status(200).send({ drivers: JSON.parse(cachedMostSelectedDrivers) });
      return;
    }

    const drivers = await prisma.driver.findMany({
      orderBy: [{ chosenPercentage: "desc" }, { points: "desc" }],
      take: 3,
    });

    res.status(200).send({ drivers: drivers });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong" });
  }
};

// Find constructors - sorted by most chosen

export const getHighestScoringDrivers = async (req: Request, res: Response) => {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: [{ points: "desc" }],
      take: 3,
    });

    res.status(200).send({ drivers: drivers });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong" });
  }
};

// Find constructors - sorted by highest scoring

