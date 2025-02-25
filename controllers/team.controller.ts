import { prisma } from "../utils/primsaClient.ts";
import { Request, Response } from "express";
import axios from "axios";
import {
  DriverStanding,
  ConstructorStanding,
  SprintResultItem,
  QualiResultItem,
  RaceResultItem,
} from "../types/types.ts";
import {
  constructorPriceScale,
  DEFAULT_CONSTRUCTOR_PRICE,
  DEFAULT_DRIVER_PRICE,
  driverPriceScale,
} from "../constants/ConstantValues.ts";

// Create a new User
export const createTeam = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.body?.user;
    const teamDrivers = req?.body?.teamDrivers;
    const teamConstructors = req?.body?.teamConstructors;
    const teamName = req?.body?.name;

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

// Get Drivers based on Drivers Standings
export const getDrivers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let apiData = await axios.get(
      "https://api.jolpi.ca/ergast/f1/2024/driverstandings"
    );

    let driversInSeason =
      apiData?.data?.MRData?.StandingsTable?.StandingsLists[0]?.DriverStandings;

    let filteredDrivers = driversInSeason.map(
      (item: DriverStanding, index: number) => {
        return {
          ...item?.Driver,
          price: driverPriceScale[index]
            ? driverPriceScale[index]
            : DEFAULT_DRIVER_PRICE,
        };
      }
    );

    res.status(200).send({ drivers: filteredDrivers });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Get Constructors based on Constructors Standings
export const getConstructors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let apiData = await axios.get(
      "https://api.jolpi.ca/ergast/f1/2024/constructorstandings"
    );

    let constructorsInSeason =
      apiData?.data?.MRData?.StandingsTable?.StandingsLists[0]
        ?.ConstructorStandings;

    let filteredConstructors = constructorsInSeason.map(
      (item: ConstructorStanding, index: number) => {
        return {
          ...item?.Constructor,
          id: index + 1,
          price: constructorPriceScale[index]
            ? constructorPriceScale[index]
            : DEFAULT_CONSTRUCTOR_PRICE,
        };
      }
    );

    res.status(200).send({ constructors: filteredConstructors });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// To auto update Race Scores
export const updateRaceScores = async () => {
  try {
    let apiData = await axios.get(
      "https://api.jolpi.ca/ergast/f1/current/last/results/"
    );

    console.log("Race :", apiData?.data?.MRData?.RaceTable?.Races);

    if (apiData?.data?.MRData?.RaceTable?.Races?.length > 0) {
      const lastRace = await prisma.lastRace.findFirst();

      if (
        lastRace?.season != apiData?.data?.MRData?.RaceTable?.season &&
        lastRace?.round != apiData?.data?.MRData?.RaceTable?.round
      ) {
        if (lastRace) {
          await prisma.lastRace.update({
            where: { id: lastRace?.id },
            data: {
              season: apiData?.data?.MRData?.RaceTable?.season,
              round: apiData?.data?.MRData?.RaceTable?.round,
              raceName: apiData?.data?.MRData?.RaceTable?.Races[0]?.raceName,
            },
          });
        } else {
          await prisma.lastRace.create({
            data: {
              season: apiData?.data?.MRData?.RaceTable?.season,
              round: apiData?.data?.MRData?.RaceTable?.round,
              raceName: apiData?.data?.MRData?.RaceTable?.Races[0]?.raceName,
            },
          });
        }

        let result = apiData?.data?.MRData?.RaceTable?.Races[0]?.Results;

        const resultPromises = result.map(
          async (driverResult: RaceResultItem) => {
            const driverId = driverResult.Driver.driverId;
            const constructorId = driverResult.Constructor.constructorId;
            const points = Number(driverResult.points) || 0; // Ensure points are numeric

            let updateOperations = [];

            // Add driver score
            if (driverId) {
              updateOperations.push(
                prisma.team.updateMany({
                  where: { driverIds: { has: driverId } },
                  data: { score: { increment: points } },
                })
              );
            }

            // Add constructor score
            if (constructorId) {
              updateOperations.push(
                prisma.team.updateMany({
                  where: { constructorIds: { has: constructorId } },
                  data: { score: { increment: points } },
                })
              );
            }

            return Promise.all(updateOperations);
          }
        );

        await Promise.all(resultPromises);
      }
    }
  } catch (err) {
    console.log(err);
    return;
  }
};

// To auto update Qualifying Scores
export const updateQualiScores = async () => {
  try {
    let apiData = await axios.get(
      "https://api.jolpi.ca/ergast/f1/current/last/qualifying/"
    );

    console.log("Quali :", apiData?.data?.MRData?.RaceTable?.Races);

    if (apiData?.data?.MRData?.RaceTable?.Races?.length > 0) {
      const lastQualifying = await prisma.lastQualifying.findFirst();

      if (
        lastQualifying?.season != apiData?.data?.MRData?.RaceTable?.season &&
        lastQualifying?.round != apiData?.data?.MRData?.RaceTable?.round
      ) {
        if (lastQualifying) {
          await prisma.lastQualifying.update({
            where: { id: lastQualifying?.id },
            data: {
              season: apiData?.data?.MRData?.RaceTable?.season,
              round: apiData?.data?.MRData?.RaceTable?.round,
              raceName: apiData?.data?.MRData?.RaceTable?.Races[0]?.raceName,
            },
          });
        } else {
          await prisma.lastQualifying.create({
            data: {
              season: apiData?.data?.MRData?.RaceTable?.season,
              round: apiData?.data?.MRData?.RaceTable?.round,
              raceName: apiData?.data?.MRData?.RaceTable?.Races[0]?.raceName,
            },
          });
        }

        let result =
          apiData?.data?.MRData?.RaceTable?.Races[0]?.QualifyingResults;

        const resultPromises = result.map(
          async (driverResult: QualiResultItem, index: number) => {
            const driverId = driverResult.Driver.driverId;
            const constructorId = driverResult.Constructor.constructorId;
            const points = Math.round((result?.length - index) / 2.5); // Ensure points are numeric

            let updateOperations = [];

            // Add driver score
            if (driverId) {
              updateOperations.push(
                prisma.team.updateMany({
                  where: { driverIds: { has: driverId } },
                  data: { score: { increment: points } },
                })
              );
            }

            // Add constructor score
            if (constructorId) {
              updateOperations.push(
                prisma.team.updateMany({
                  where: { constructorIds: { has: constructorId } },
                  data: { score: { increment: points } },
                })
              );
            }

            return Promise.all(updateOperations);
          }
        );

        await Promise.all(resultPromises);
      }
    }
  } catch (err) {
    console.log(err);
    return;
  }
};

// To auto update Sprint Scores
export const updateSprintScores = async () => {
  try {
    let apiData = await axios.get(
      "https://api.jolpi.ca/ergast/f1/current/last/sprint/"
    );

    console.log("Sprint :", apiData?.data?.MRData?.RaceTable?.Races);

    if (apiData?.data?.MRData?.RaceTable?.Races?.length > 0) {
      const lastSprint = await prisma.lastSprint.findFirst();

      if (
        lastSprint?.season != apiData?.data?.MRData?.RaceTable?.season &&
        lastSprint?.round != apiData?.data?.MRData?.RaceTable?.round
      ) {
        if (lastSprint) {
          await prisma.lastSprint.update({
            where: { id: lastSprint?.id },
            data: {
              season: apiData?.data?.MRData?.RaceTable?.season,
              round: apiData?.data?.MRData?.RaceTable?.round,
              raceName: apiData?.data?.MRData?.RaceTable?.Races[0]?.raceName,
            },
          });
        } else {
          await prisma.lastSprint.create({
            data: {
              season: apiData?.data?.MRData?.RaceTable?.season,
              round: apiData?.data?.MRData?.RaceTable?.round,
              raceName: apiData?.data?.MRData?.RaceTable?.Races[0]?.raceName,
            },
          });
        }

        let result = apiData?.data?.MRData?.RaceTable?.Races[0]?.SprintResults;

        const resultPromises = result.map(
          async (driverResult: SprintResultItem) => {
            const driverId = driverResult.Driver.driverId;
            const constructorId = driverResult.Constructor.constructorId;
            const points = Number(driverResult.points) || 0; // Ensure points are numeric

            let updateOperations = [];

            // Add driver score
            if (driverId) {
              updateOperations.push(
                prisma.team.updateMany({
                  where: { driverIds: { has: driverId } },
                  data: { score: { increment: points } },
                })
              );
            }

            // Add constructor score
            if (constructorId) {
              updateOperations.push(
                prisma.team.updateMany({
                  where: { constructorIds: { has: constructorId } },
                  data: { score: { increment: points } },
                })
              );
            }

            return Promise.all(updateOperations);
          }
        );

        await Promise.all(resultPromises);
      }
    }
  } catch (err) {
    console.log(err);
    return;
  }
};
