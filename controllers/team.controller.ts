import { prisma } from "../utils/primsaClient.ts";
import { Request, Response } from "express";
import { drivers } from "../data/Drivers.ts";
import { constructors } from "../data/Constructors.ts";
import { raceResult } from "../data/RaceResult.ts";

// Create a new User
export const createTeam = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.body?.user;
    const teamDrivers = req?.body?.teamDrivers;
    const teamConstructors = req?.body?.teamConstructors;

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

    const selectedDrivers = teamDrivers.map((item: any) => item?.driverId);
    const selectedConstructors = teamConstructors.map(
      (item: any) => item?.constructorId
    );

    const createdTeam = await prisma.team.create({
      data: {
        teamDrivers: teamDrivers,
        teamConstructors: teamConstructors,
        driverIds: selectedDrivers,
        constructorIds: selectedConstructors,
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

// Get Constructors
export const getConstructors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let constructorsInSeason =
      constructors?.MRData?.ConstructorTable?.Constructors;

    constructorsInSeason = constructorsInSeason.map((item, index) => {
      return { ...item, id: index + 1 };
    });

    res.status(200).send({ constructors: constructorsInSeason });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};
