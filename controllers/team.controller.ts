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
import { driversOpenF1 } from "../constants/Drivers.ts";

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

// Find public leagues
export const getPublicLeagues = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const leagues = await prisma.league.findMany({
      where: {
        private: false,
      },
      orderBy: {
        numberOfTeams: "desc",
      },
      skip: req?.body?.page * 4,
      take: 4,
    });

    // Check if next page exists.
    const nextPage = await prisma.league.count({
      orderBy: {
        createdAt: "desc",
      },
      skip: (req?.body?.page + 1) * 4,
      take: 4,
    });

    // Return the leagues
    res.status(200).send({
      leagues: leagues,
      nextPage: nextPage != 0 ? req?.body?.page + 1 : null,
    });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Search for Public Leagues
export const searchPublicLeagues = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const searchTerm = req?.body?.searchTerm;
    const page = req?.body?.page;

    // Find all leagues
    const leagues = await prisma.league.findMany({
      where: {
        private: false,
        OR: [
          { leagueId: { contains: searchTerm, mode: "insensitive" } },
          { name: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      select: {
        name: true,
        leagueId: true,
        numberOfTeams: true,
        User: {
          select: {
            name: true,
            username: true,
            photoURL: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: page * 2,
      take: 2,
    });

    // Check if next page exists.
    const nextPageExists = await prisma.league.count({
      where: {
        OR: [
          { leagueId: { contains: searchTerm, mode: "insensitive" } },
          { name: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      skip: page * 2,
      take: 2,
    });

    // Return the current page posts and next page number
    res.status(200).send({
      leagues: leagues,
      nextPage: nextPageExists != 0 ? page + 1 : null,
    });
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
    let drivers = await prisma.driver.findMany();

    res.status(200).send({ drivers: drivers });
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
    let constructors = await prisma.constructor.findMany();

    res.status(200).send({ constructors: constructors });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};
