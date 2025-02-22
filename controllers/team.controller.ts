import { prisma } from "../utils/primsaClient.ts";
import { Request, Response } from "express";
import { drivers } from "../data/Drivers.ts";
import { raceResult } from "../data/RaceResult.ts";

// Create a new User
export const createTeam = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.body?.user;
    const team = req?.body?.team;

    const userinDB = await prisma.user.findUnique({
      where: {
        firebaseUID: user?.firebaseUID,
      },
    });

    // If user not present in DB
    if (!userinDB) {
      res.status(404).send({ data: "User does not exist." });
      return;
    }

    const selectedDrivers = team.map((item: any) => item?.driverId);

    const createdTeam = await prisma.team.create({
      data: {
        team: team,
        driverIds: selectedDrivers,
        userId: userinDB?.id,
      },
    });

    res.status(200).send({ data: createdTeam });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Get Drivers
export const getDrivers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const driversInSeason = drivers?.MRData?.DriverTable?.Drivers;

    res.status(200).send({ drivers: driversInSeason });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};
