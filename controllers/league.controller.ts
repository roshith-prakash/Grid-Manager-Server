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

export const createLeague = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req?.body?.userId;
    const leagueName = req?.body?.leagueName;
    const isPrivate = req?.body?.isPrivate;

    const validationError = isValidName(leagueName);
    if (validationError) {
      res.status(400).send({ data: validationError });
      return;
    }

    // Find User
    const userinDB = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: { id: true },
    });

    // User is not present
    if (!userinDB) {
      res.status(404).send({ data: "User does not exist." });
      return;
    }

    const leagueCount = await prisma.league.count({
      where: {
        OR: [
          {
            userId: userinDB?.id,
          },
          {
            teams: { some: { userId: userinDB?.id } },
          },
        ],
      },
    });

    // A user can join a maximum of "numberOfPossibleLeagues" teams. Includes user created leagues.
    if (leagueCount >= numberOfPossibleLeagues) {
      res.status(403).send({ data: "Maximum number of leagues reached." });
      return;
    }

    // Generate an ID for the league
    const leagueId = generateLeagueUID();

    const newLeague = await prisma.league.create({
      data: {
        name: leagueName,
        userId: userId,
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
      distinct: ["id"],
      skip: req?.body?.page * 4,
      take: 4,
    });

    // Check if next page exists.
    const nextPage = await prisma.league.count({
      orderBy: {
        numberOfTeams: "desc",
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
    const userId = req?.body?.userId;

    // Find all leagues
    const leagues = await prisma.league.findMany({
      where: {
        OR: [
          // Leagues created by the user
          {
            userId: userId,
            OR: [
              { leagueId: { contains: searchTerm, mode: "insensitive" } },
              { name: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
          // Public leagues
          {
            private: false,
            OR: [
              { leagueId: { contains: searchTerm, mode: "insensitive" } },
              { name: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
          // Private leagues in which user is present
          {
            private: true,
            teams: { some: { userId: userId } },
            OR: [
              { leagueId: { contains: searchTerm, mode: "insensitive" } },
              { name: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
          // Private league whose league ID is specified correctly.
          {
            private: true,
            leagueId: { equals: searchTerm, mode: "insensitive" },
          },
        ],
      },
      distinct: ["id"],
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
      orderBy: { numberOfTeams: "desc" },
      skip: page * 2,
      take: 2,
    });

    // Check if next page exists.
    const nextPageExists = await prisma.league.count({
      where: {
        OR: [
          // Leagues created by the user
          {
            userId: userId,
            OR: [
              { leagueId: { contains: searchTerm, mode: "insensitive" } },
              { name: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
          // Public leagues
          {
            private: false,
            OR: [
              { leagueId: { contains: searchTerm, mode: "insensitive" } },
              { name: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
          // Private leagues in which user is present
          {
            private: true,
            teams: { some: { userId: userId } },
            OR: [
              { leagueId: { contains: searchTerm, mode: "insensitive" } },
              { name: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
          // Private league whose league ID is specified correctly.
          {
            private: true,
            leagueId: { equals: searchTerm, mode: "insensitive" },
          },
        ],
      },
      orderBy: { numberOfTeams: "desc" },
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
      select: {
        id: true,
        leagueId: true,
        name: true,
        private: true,
        numberOfTeams: true,
        User: {
          select: {
            id: true,
            name: true,
            photoURL: true,
            username: true,
          },
        },
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

// Update the league info

export const updateLeague = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const leagueName = req?.body?.leagueName;
    const isPrivate = req?.body?.isPrivate;
    const leagueId = req?.body?.leagueId;
    const userId = req?.body?.userId;

    const validationError = isValidName(leagueName);
    if (validationError) {
      res.status(400).send({ data: validationError });
      return;
    }

    // Find the league to be updated
    const league = await prisma.league.findUnique({
      where: {
        leagueId: leagueId,
        userId: userId,
      },
    });

    // Send error if league does not exist
    if (!league) {
      res.status(404).send({ data: "League does not exist." });
      return;
    }

    // Update the league
    const updatedLeague = await prisma.league.update({
      where: {
        leagueId: leagueId,
      },
      data: {
        name: leagueName,
        private: isPrivate,
      },
    });

    res.status(200).send({ data: updatedLeague });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Delete the league

export const deleteLeague = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const leagueId = req?.body?.leagueId;
    const userId = req?.body?.userId;

    // Find the league to be updated
    const league = await prisma.league.findUnique({
      where: {
        leagueId: leagueId,
        userId: userId,
      },
    });

    // Send error if league does not exist
    if (!league) {
      res.status(404).send({ data: "League does not exist." });
      return;
    }

    const teams = await prisma.team.findMany({
      where: {
        leagueId: league?.id,
      },
    });

    teams?.map(async (team) => {
      await prisma.driverInTeam.deleteMany({
        where: {
          teamId: team?.id,
        },
      });

      await prisma.constructorInTeam.deleteMany({
        where: {
          teamId: team?.id,
        },
      });
    });

    // Delete the teams in the league
    await prisma.team.deleteMany({
      where: {
        leagueId: league?.id,
      },
    });

    // Delete the league
    await prisma.league.delete({
      where: {
        id: league?.id,
      },
    });

    const totalTeamCount = await prisma.team.count();

    // Update driver chosen percentage for all drivers
    const allDrivers = await prisma.driver.findMany();
    await Promise.all(
      allDrivers.map(async (driver) => {
        const teamWithDriverCount = await prisma.team.count({
          where: {
            driverIds: {
              has: driver.driverId,
            },
          },
        });

        const chosenPercentage =
          totalTeamCount > 0 ? (teamWithDriverCount / totalTeamCount) * 100 : 0;

        await prisma.driver.update({
          where: { driverId: driver.driverId },
          data: { chosenPercentage },
        });
      })
    );

    // Update constructor chosen percentage
    const allConstructors = await prisma.constructor.findMany();
    await Promise.all(
      allConstructors.map(async (constructor) => {
        const teamWithConstructorCount = await prisma.team.count({
          where: {
            constructorIds: {
              has: constructor.constructorId,
            },
          },
        });

        const chosenPercentage =
          totalTeamCount > 0
            ? (teamWithConstructorCount / totalTeamCount) * 100
            : 0;

        await prisma.constructor.update({
          where: { constructorId: constructor.constructorId },
          data: { chosenPercentage },
        });
      })
    );

    res.status(200).send({ data: "League deleted." });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Check if user has not exceeded league limits

export const checkIfUserCanJoinLeague = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.body?.userId;

    // Find User
    const userinDB = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: { id: true },
    });

    // User is not present
    if (!userinDB) {
      res.status(404).send({ data: "User does not exist." });
      return;
    }

    // Check number of leagues the user has joined
    const leagueCount = await prisma.league.count({
      where: {
        OR: [
          {
            userId: userinDB?.id,
          },
          {
            teams: { some: { userId: userinDB?.id } },
          },
        ],
      },
    });

    // A user can join a maximum of "numberOfPossibleLeagues" teams. Includes user created leagues.
    if (leagueCount >= numberOfPossibleLeagues) {
      res.status(200).send({ canUserJoinLeague: false });
      return;
    }

    res.status(200).send({ canUserJoinLeague: true });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong!" });
    return;
  }
};

// ------------------------------------------------------------------------------------------------------------------------

// View Teams & Leagues for a user

// Get all Teams for the user (Current user)

export const getCurrentUserLeagues = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const username = req?.body?.username;
    const page = req?.body?.page;

    // Find user by username
    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
      select: {
        id: true, // Get user ID
      },
    });

    // If user is not present - send 404 error
    if (!user) {
      res.status(404).send({ data: "User not found." });
      return;
    }

    // Fetch leagues where the user is either the creator or a participant
    const leagues = await prisma.league.findMany({
      where: {
        OR: [
          { userId: user.id }, // User created the league
          { teams: { some: { userId: user.id } } }, // User is part of a league via a team
        ],
      },
      distinct: ["id"],
      select: {
        id: true,
        leagueId: true,
        name: true,
        private: true,
        numberOfTeams: true,
        createdAt: true,
        updatedAt: true,
        User: {
          select: {
            name: true,
            username: true,
            photoURL: true,
          },
        },
      },
      orderBy: { numberOfTeams: "desc" },
      skip: page * 4,
      take: 4,
    });

    // Check if more leagues exist where the user is either the creator or a participant
    const nextPageExists = await prisma.league.count({
      where: {
        OR: [
          { userId: user.id }, // User created the league
          { teams: { some: { userId: user.id } } }, // User is part of a league via a team
        ],
      },
      orderBy: { numberOfTeams: "desc" },
      skip: page * 4,
      take: 4,
    });

    res.status(200).send({
      leagues: leagues,
      nextPage: nextPageExists != 0 ? page + 1 : null,
    });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
  }
};

// Get all the leagues that a user is in (participant or admin)

export const getUserPublicLeagues = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const username = req?.body?.username;
    const page = req?.body?.page;
    const currentUserId = req?.body?.currentUserId;

    // Find user by username
    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
      select: {
        id: true, // Get user ID
      },
    });

    // If user is not present - send 404 error
    if (!user) {
      res.status(404).send({ data: "User not found." });
      return;
    }

    // Fetch leagues where the user is either the creator or a participant
    const leagues = await prisma.league.findMany({
      where: {
        OR: [
          {
            private: false, // Public leagues (open for all)
            OR: [
              { userId: user.id }, // User created the league
              { teams: { some: { userId: user.id } } }, // User is part of a team in the league
            ],
          },
          {
            private: true, // Private leagues (only if user has a team)
            AND: [
              { teams: { some: { userId: user?.id } } },
              { teams: { some: { userId: currentUserId } } },
            ],
          },
        ],
      },
      distinct: ["id"],
      select: {
        id: true,
        leagueId: true,
        name: true,
        private: true,
        numberOfTeams: true,
        createdAt: true,
        updatedAt: true,
        User: {
          select: {
            name: true,
            username: true,
            photoURL: true,
          },
        },
      },
      orderBy: { numberOfTeams: "desc" },
      skip: page * 4,
      take: 4,
    });

    // Check if more leagues exist where the user is either the creator or a participant
    const nextPageExists = await prisma.league.count({
      where: {
        OR: [
          {
            private: false, // Public leagues (open for all)
            OR: [
              { userId: user.id }, // User created the league
              { teams: { some: { userId: user.id } } }, // User is part of a team in the league
            ],
          },
          {
            private: true, // Private leagues (only if user has a team)
            teams: { some: { userId: currentUserId } },
          },
        ],
      },
      orderBy: { numberOfTeams: "desc" },
      skip: page * 4,
      take: 4,
    });

    res.status(200).send({
      leagues: leagues,
      nextPage: nextPageExists != 0 ? page + 1 : null,
    });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
  }
};

// Get all Public Teams for a user (Non current user)

export const getTeamsInaLeague = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const leagueId = req?.body?.leagueId;
    const page = req?.body?.page;

    // Find the league
    const league = await prisma.league.findUnique({
      where: { leagueId: leagueId },
    });

    // If league does not exist - send an error
    if (!league) {
      res.status(404).send({ data: "League does not exist." });
      return;
    }

    // Find all teams
    const teams = await prisma.team.findMany({
      where: {
        leagueId: league?.id,
      },
      select: {
        id: true,
        name: true,
        score: true,
        User: {
          select: { id: true, name: true, username: true, photoURL: true },
        },
      },
      distinct: ["id"],
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
      skip: page * 4,
      take: 4,
    });

    // Check if next page exists
    const nextPageExists = await prisma.team.count({
      where: {
        leagueId: league?.id,
      },
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
      skip: (page + 1) * 4,
      take: 4,
    });

    // Return the current page posts and next page number
    res.status(200).send({
      teams: teams,
      nextPage: nextPageExists != 0 ? page + 1 : null,
    });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Edit an existing Team

