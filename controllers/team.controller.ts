import { prisma } from "../utils/primsaClient.ts";
import { Request, Response } from "express";
import axios from "axios";
import { DriverStanding, ConstructorStanding } from "../types/types.ts";
import {
  constructorPriceScale,
  DEFAULT_CONSTRUCTOR_PRICE,
  DEFAULT_DRIVER_PRICE,
  driverPriceScale,
} from "../constants/ConstantValues.ts";
import { generateLeagueUID } from "../utils/generateLeagueUID.ts";

// Create a new league
export const createLeague = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req?.body?.user;
    const leagueName = req?.body?.leagueName;
    const isPrivate = req?.body?.isPrivate;

    // Generate an ID for the league
    const leagueId = generateLeagueUID();

    const newLeague = await prisma.league.create({
      data: {
        name: leagueName,
        userId: user?.id,
        leagueId: leagueId,
        private: isPrivate,
      },
    });

    res.status(200).send({ data: newLeague });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Find a league by leagueId
export const getLeague = async (req: Request, res: Response): Promise<void> => {
  try {
    const leagueId = req?.body?.leagueId;

    const league = await prisma.league.findUnique({
      where: {
        leagueId: leagueId,
      },
      include: {
        User: true,
      },
    });

    if (league) {
      res.status(200).send({ data: league });
      return;
    } else {
      res.status(404).send({ data: "League does not exist" });
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Create a new Team
export const createTeam = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.body?.user;
    const teamDrivers = req?.body?.teamDrivers;
    const teamConstructors = req?.body?.teamConstructors;
    const teamName = req?.body?.teamName;
    const leagueId = req?.body?.leagueId;

    const userinDB = await prisma.user.findUnique({
      where: {
        firebaseUID: user?.firebaseUID,
      },
    });

    // If user is not present in DB
    if (!userinDB) {
      res.status(404).send({ data: "User does not exist." });
      return;
    }

    const league = await prisma.league.findUnique({
      where: {
        leagueId: leagueId,
      },
    });

    // If league is not present in DB
    if (!league) {
      res.status(404).send({ data: "League does not exist." });
      return;
    }

    const selectedDrivers = teamDrivers.map((item: any) => item?.driverId);
    const selectedConstructors = teamConstructors.map(
      (item: any) => item?.constructorId
    );

    const createdTeam = await prisma.team.create({
      data: {
        name: teamName,
        teamDrivers: teamDrivers,
        teamConstructors: teamConstructors,
        driverIds: selectedDrivers,
        constructorIds: selectedConstructors,
        userId: userinDB?.id,
        leagueId: league?.id,
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
