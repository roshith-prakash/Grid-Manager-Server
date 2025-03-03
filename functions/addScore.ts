import { prisma } from "../utils/primsaClient.ts";
import axios from "axios";
import {
  SprintResultItem,
  QualiResultItem,
  RaceResultItem,
} from "../types/types.ts";

// To auto update Race Scores
export const updateRaceScores = async () => {
  try {
    // Get data for last race
    let apiData = await axios.get(
      "https://api.jolpi.ca/ergast/f1/2024/last/results/"
    );

    // Check if data is present.
    if (apiData?.data?.MRData?.RaceTable?.Races?.length > 0) {
      //   Get last race for which scores were added.
      const lastRace = await prisma.lastRace.findFirst();

      //   If the last race (API) is not the same as the data in the DB - (New Data is Present)
      if (
        lastRace?.season != apiData?.data?.MRData?.RaceTable?.season &&
        lastRace?.round != apiData?.data?.MRData?.RaceTable?.round
      ) {
        // Data is present in the DB
        if (lastRace) {
          // Update the last race in the DB
          await prisma.lastRace.update({
            where: { id: lastRace?.id },
            data: {
              season: Number(apiData?.data?.MRData?.RaceTable?.season),
              round: Number(apiData?.data?.MRData?.RaceTable?.round),
              raceName: apiData?.data?.MRData?.RaceTable?.Races[0]?.raceName,
            },
          });
        }
        // Data was not present in the DB
        else {
          // Create the last race object
          await prisma.lastRace.create({
            data: {
              season: Number(apiData?.data?.MRData?.RaceTable?.season),
              round: Number(apiData?.data?.MRData?.RaceTable?.round),
              raceName: apiData?.data?.MRData?.RaceTable?.Races[0]?.raceName,
            },
          });
        }

        // Get the race result from the API result.
        let result = apiData?.data?.MRData?.RaceTable?.Races[0]?.Results;

        // Loop through the result array
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

            return updateOperations;
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
      "https://api.jolpi.ca/ergast/f1/2024/last/qualifying/"
    );

    console.log(
      "Quali :",
      apiData?.data?.MRData?.RaceTable?.Races?.length > 0 ? "Present" : "Absent"
    );

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
              season: Number(apiData?.data?.MRData?.RaceTable?.season),
              round: Number(apiData?.data?.MRData?.RaceTable?.round),
              raceName: apiData?.data?.MRData?.RaceTable?.Races[0]?.raceName,
            },
          });
        } else {
          await prisma.lastQualifying.create({
            data: {
              season: Number(apiData?.data?.MRData?.RaceTable?.season),
              round: Number(apiData?.data?.MRData?.RaceTable?.round),
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
      "https://api.jolpi.ca/ergast/f1/2024/last/sprint/"
    );

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
              season: Number(apiData?.data?.MRData?.RaceTable?.season),
              round: Number(apiData?.data?.MRData?.RaceTable?.round),
              raceName: apiData?.data?.MRData?.RaceTable?.Races[0]?.raceName,
            },
          });
        } else {
          await prisma.lastSprint.create({
            data: {
              season: Number(apiData?.data?.MRData?.RaceTable?.season),
              round: Number(apiData?.data?.MRData?.RaceTable?.round),
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
