import { prisma } from "../utils/primsaClient.ts";
import axios from "axios";
import {
  SprintResultItem,
  QualiResultItem,
  RaceResultItem,
} from "../types/types.ts";
import { updatePrices } from "./updatePrice.ts";

// To auto update Race Scores
export const updateRaceScores = async () => {
  try {
    // Get data for last race
    let apiData = await axios.get(
      "https://api.jolpi.ca/ergast/f1/current/last/results/"
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

        let updateOperations: any[] = [];

        console.log(
          `Updating Race Scores for Season : ${apiData?.data?.MRData?.RaceTable?.season} Round : ${apiData?.data?.MRData?.RaceTable?.round}....`
        );

        // Loop through the result array
        result.map((driverResult: RaceResultItem, index: number) => {
          const driverId = driverResult.Driver.driverId;
          const constructorId = driverResult.Constructor.constructorId;
          const round = apiData?.data?.MRData?.RaceTable?.round;
          const raceName = apiData?.data?.MRData?.RaceTable?.Races[0]?.raceName;
          const points =
            (Number(driverResult.points) || 0) +
            Math.round((result?.length - index) / 1.25); // Ensure points are numeric

          // Add driver score
          if (driverId) {
            // Update points for team
            updateOperations.push(
              prisma.team.updateMany({
                where: { driverIds: { has: driverId } },
                data: { score: { increment: points } },
              })
            );

            // Update points for drivers in Teams
            updateOperations.push(
              prisma.driverInTeam.updateMany({
                where: { driverId: driverId },
                data: {
                  pointsForTeam: { increment: points },
                  teamPointsHistory: {
                    push: {
                      round: round,
                      raceName: raceName,
                      session: "Race",
                      points: points,
                    },
                  },
                },
              })
            );

            // Update points for the Main driver table
            updateOperations.push(
              prisma.driver.update({
                where: { driverId: driverId },
                data: {
                  points: { increment: points },
                  pointsHistory: {
                    push: {
                      round: round,
                      raceName: raceName,
                      session: "Race",
                      points: points,
                    },
                  },
                },
              })
            );
          }

          // Add constructor score
          if (constructorId) {
            // Update points for team
            updateOperations.push(
              prisma.team.updateMany({
                where: { constructorIds: { has: constructorId } },
                data: { score: { increment: Math.round(points * 0.75) } },
              })
            );

            // Update points for constructors in Teams
            updateOperations.push(
              prisma.constructorInTeam.updateMany({
                where: { constructorId: constructorId },
                data: {
                  pointsForTeam: { increment: Math.round(points * 0.75) },
                  teamPointsHistory: {
                    push: {
                      round: round,
                      raceName: raceName,
                      session: "Race",
                      points: Math.round(points * 0.75),
                    },
                  },
                },
              })
            );

            // Update points for the Main constructor table
            updateOperations.push(
              prisma.constructor.update({
                where: { constructorId: constructorId },
                data: {
                  points: { increment: Math.round(points * 0.75) },
                  pointsHistory: {
                    push: {
                      round: round,
                      raceName: raceName,
                      session: "Race",
                      points: Math.round(points * 0.75),
                    },
                  },
                },
              })
            );
          }
        });

        await Promise.all(updateOperations);

        console.log(
          `Updated Race Scores for Season : ${apiData?.data?.MRData?.RaceTable?.season} Round : ${apiData?.data?.MRData?.RaceTable?.round}....`
        );

        updatePrices();
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

    if (apiData?.data?.MRData?.RaceTable?.Races?.length > 0) {
      const lastQualifying = await prisma.lastQualifying.findFirst();

      if (
        lastQualifying?.season != apiData?.data?.MRData?.RaceTable?.season &&
        lastQualifying?.round != apiData?.data?.MRData?.RaceTable?.round
      ) {
        // Update the last qualifying session
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

        console.log(
          `Updating Qualifying Scores for Season : ${apiData?.data?.MRData?.RaceTable?.season} Round : ${apiData?.data?.MRData?.RaceTable?.round}....`
        );

        let result =
          apiData?.data?.MRData?.RaceTable?.Races[0]?.QualifyingResults;

        let updateOperations: any[] = [];

        // Map through the result
        result.map((driverResult: QualiResultItem, index: number) => {
          const driverId = driverResult.Driver.driverId;
          const constructorId = driverResult.Constructor.constructorId;
          const round = apiData?.data?.MRData?.RaceTable?.round;
          const raceName = apiData?.data?.MRData?.RaceTable?.Races[0]?.raceName;
          const points = Math.round((result?.length - index) / 1.5); // Ensure points are numeric

          // Add driver score
          if (driverId) {
            // Update points for team
            updateOperations.push(
              prisma.team.updateMany({
                where: { driverIds: { has: driverId } },
                data: { score: { increment: points } },
              })
            );

            // Update points for drivers in Teams
            updateOperations.push(
              prisma.driverInTeam.updateMany({
                where: { driverId: driverId },
                data: {
                  pointsForTeam: { increment: points },
                  teamPointsHistory: {
                    push: {
                      round: round,
                      raceName: raceName,
                      session: "Qualifying",
                      points: points,
                    },
                  },
                },
              })
            );

            // Update points for the Main driver table
            updateOperations.push(
              prisma.driver.update({
                where: { driverId: driverId },
                data: {
                  points: { increment: points },
                  pointsHistory: {
                    push: {
                      round: round,
                      raceName: raceName,
                      session: "Qualifying",
                      points: points,
                    },
                  },
                },
              })
            );
          }

          // Add constructor score
          if (constructorId) {
            // Update points for team
            updateOperations.push(
              prisma.team.updateMany({
                where: { constructorIds: { has: constructorId } },
                data: { score: { increment: Math.round(points * 0.75) } },
              })
            );

            // Update points for constructors in Teams
            updateOperations.push(
              prisma.constructorInTeam.updateMany({
                where: { constructorId: constructorId },
                data: {
                  pointsForTeam: { increment: Math.round(points * 0.75) },
                  teamPointsHistory: {
                    push: {
                      round: round,
                      raceName: raceName,
                      session: "Qualifying",
                      points: Math.round(points * 0.75),
                    },
                  },
                },
              })
            );

            // Update points for the Main constructor table
            updateOperations.push(
              prisma.constructor.update({
                where: { constructorId: constructorId },
                data: {
                  points: { increment: Math.round(points * 0.75) },
                  pointsHistory: {
                    push: {
                      round: round,
                      raceName: raceName,
                      session: "Qualifying",
                      points: Math.round(points * 0.75),
                    },
                  },
                },
              })
            );
          }
        });

        await Promise.all(updateOperations);

        console.log(
          `Updated Qualifying Scores for Season : ${apiData?.data?.MRData?.RaceTable?.season} Round : ${apiData?.data?.MRData?.RaceTable?.round}`
        );
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

        let updateOperations: any[] = [];

        console.log(
          `Updating Sprint Scores for Season : ${apiData?.data?.MRData?.RaceTable?.season} Round : ${apiData?.data?.MRData?.RaceTable?.round}....`
        );

        result.map(async (driverResult: SprintResultItem, index: number) => {
          const driverId = driverResult.Driver.driverId;
          const constructorId = driverResult.Constructor.constructorId;
          const round = apiData?.data?.MRData?.RaceTable?.round;
          const raceName = apiData?.data?.MRData?.RaceTable?.Races[0]?.raceName;
          const points =
            (Number(driverResult.points) || 0) +
            Math.round((result?.length - index) / 1.5); // Ensure points are numeric

          let updateOperations = [];

          // Add driver score
          if (driverId) {
            // Update points for team
            updateOperations.push(
              prisma.team.updateMany({
                where: { driverIds: { has: driverId } },
                data: { score: { increment: points } },
              })
            );

            // Update points for drivers in Teams
            updateOperations.push(
              prisma.driverInTeam.updateMany({
                where: { driverId: driverId },
                data: {
                  pointsForTeam: { increment: points },
                  teamPointsHistory: {
                    push: {
                      round: round,
                      raceName: raceName,
                      session: "Sprint",
                      points: points,
                    },
                  },
                },
              })
            );

            // Update points for the Main driver table
            updateOperations.push(
              prisma.driver.update({
                where: { driverId: driverId },
                data: {
                  points: { increment: points },
                  pointsHistory: {
                    push: {
                      round: round,
                      raceName: raceName,
                      session: "Sprint",
                      points: points,
                    },
                  },
                },
              })
            );
          }

          // Add constructor score
          if (constructorId) {
            // Update points for team
            updateOperations.push(
              prisma.team.updateMany({
                where: { constructorIds: { has: constructorId } },
                data: { score: { increment: Math.round(points * 0.75) } },
              })
            );

            // Update points for constructors in Teams
            updateOperations.push(
              prisma.constructorInTeam.updateMany({
                where: { constructorId: constructorId },
                data: {
                  pointsForTeam: { increment: Math.round(points * 0.75) },
                  teamPointsHistory: {
                    push: {
                      round: round,
                      raceName: raceName,
                      session: "Sprint",
                      points: Math.round(points * 0.75),
                    },
                  },
                },
              })
            );

            // Update points for the Main constructor table
            updateOperations.push(
              prisma.constructor.update({
                where: { constructorId: constructorId },
                data: {
                  points: { increment: Math.round(points * 0.75) },
                  pointsHistory: {
                    push: {
                      round: round,
                      raceName: raceName,
                      session: "Sprint",
                      points: Math.round(points * 0.75),
                    },
                  },
                },
              })
            );
          }
        });

        console.log(
          `Updated Sprint Scores for Season : ${apiData?.data?.MRData?.RaceTable?.season} Round : ${apiData?.data?.MRData?.RaceTable?.round}....`
        );
        await Promise.all(updateOperations);
      }
    }
  } catch (err) {
    console.log(err);
    return;
  }
};
