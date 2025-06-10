// @ts-nocheck
import { prisma } from "../utils/primsaClient.ts";

const MIN_PRICE_DRIVER = 4;
const MAX_PRICE_DRIVER = 25;

const MIN_PRICE_CONSTRUCTOR = 10;
const MAX_PRICE_CONSTRUCTOR = 35;

// Improved Pricing code contributed by Nitin Madas (@nitinmadas)

export const updatePrices = async () => {
  try {
    // Function to normalize and calculate new prices for drivers
    const calculateNormalizedPricesDrivers = (drivers) => {
      const driverScores = drivers.map((driver) => {
        const totalPoints = driver.points || 0;
        const pointsHistory = driver.pointsHistory || [];
        const last5RacePoints = pointsHistory
          .slice(-5) // Get the last 5 entries
          .map((entry) => entry?.points || 0); // Extract points, fallback to 0 if undefined

        const latestPoints = last5RacePoints.reduce((sum, val) => sum + val, 0);
        const avgPointsForLast5Races = latestPoints / 5;

        const score = 0.85 * totalPoints + 0.15 * avgPointsForLast5Races;

        return {
          ...driver,
          score,
        };
      });

      const scores = driverScores.map((d) => d.score);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);

      const normalizedDrivers = driverScores.map((d) => {
        const normalizedPrice =
          MIN_PRICE_DRIVER +
          ((d.score - minScore) / (maxScore - minScore)) *
            (MAX_PRICE_DRIVER - MIN_PRICE_DRIVER);
        return {
          ...d,
          newPrice: Math.round(normalizedPrice),
          Efficiency: Number(d?.points / Math.round(normalizedPrice)).toFixed(
            2
          ),
        };
      });

      return normalizedDrivers;
    };

    // Function to normalize and calculate new prices for constructors
    const calculateNormalizedPricesConstructors = (constructors) => {
      const constructorScores = constructors.map((constructor) => {
        const totalPoints = constructor.points || 0;
        const pointsHistory = constructor.pointsHistory || [];
        const last5RacePoints = pointsHistory
          .slice(-5) // Get the last 5 entries
          .map((entry) => entry?.points || 0); // Extract points, fallback to 0 if undefined

        const latestPoints = last5RacePoints.reduce((sum, val) => sum + val, 0);
        const avgPointsForLast5Races = latestPoints / 5;

        const score = 0.85 * totalPoints + 0.15 * avgPointsForLast5Races;

        return {
          ...constructor,
          score,
        };
      });

      const scores = constructorScores.map((d) => d.score);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);

      const normalizedConstructors = constructorScores.map((d) => {
        const normalizedPrice =
          MIN_PRICE_CONSTRUCTOR +
          ((d.score - minScore) / (maxScore - minScore)) *
            (MAX_PRICE_CONSTRUCTOR - MIN_PRICE_CONSTRUCTOR);
        return {
          ...d,
          newPrice: Math.round(normalizedPrice),
          Efficiency: Number(d?.points / Math.round(normalizedPrice)).toFixed(
            2
          ),
        };
      });

      return normalizedConstructors;
    };

    // Fetching Drivers from DB
    const driversFromDb = await prisma.driver.findMany({
      select: {
        driverId: true,
        points: true,
        price: true,
      },
      orderBy: {
        points: "desc",
      },
    });

    // Calculating new prices for drivers
    const updatedPricesDriver = calculateNormalizedPricesDrivers(driversFromDb);

    // Fetching Constructors from DB
    const constructorsFromDb = await prisma.constructor.findMany({
      select: {
        constructorId: true,
        points: true,
        price: true,
      },
      orderBy: {
        points: "desc",
      },
    });

    // Calculating new prices for constructors
    const updatedPricesConstructor =
      calculateNormalizedPricesConstructors(constructorsFromDb);

    // Updating Driver Prices in DB
    for (const driver of updatedPricesDriver) {
      await prisma.driver.update({
        where: { driverId: driver.driverId },
        data: { price: driver.newPrice },
      });
    }

    // Updating Constructor Prices in DB
    for (const constructor of updatedPricesConstructor) {
      await prisma.constructor.update({
        where: { constructorId: constructor.constructorId },
        data: { price: constructor.newPrice },
      });
    }
  } catch (err) {
    console.log(err);
  }
};
