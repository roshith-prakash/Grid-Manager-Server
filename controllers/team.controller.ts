import { prisma } from "../utils/primsaClient.ts";
import { Request, Response } from "express";
import { generateLeagueUID } from "../utils/generateLeagueUID.ts";
import { Constructor, Driver } from "@prisma/client";
import {
  changeCost,
  freeChangeLimit,
  numberOfPossibleLeagues,
  numberOfPossibleTeamsInALeague,
} from "../constants/DatabaseConstants.ts";
import { countNumberOfChanges } from "../utils/countNumberOfChanges.ts";

// ---------------------------------------------------------------------------------------------------------------------

// DRIVERS & CONSTRUCTORS

// Get Drivers based on Drivers Standings
export const getDrivers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
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
      },
    });

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

// Get Driver statistics
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
export const getConstructorStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const constructorId = req?.body?.constructorId;
    const userId = req?.body?.userId;
    const teamId = req?.body?.teamId;

    let constructor = await prisma.constructor.findUnique({
      where: {
        constructorId: constructorId,
      },
    });

    if (!constructor) {
      res.status(404).send({ data: "Constructor not found." });
      return;
    }

    // If the driver is present in the team of the user
    if (teamId && userId) {
      // Find the driver in team
      let userConstructor = await prisma.constructorInTeam.findFirst({
        where: {
          constructorId: constructorId,
          teamId: teamId,
          Team: {
            userId: userId,
          },
        },
      });

      // If driver in team is found
      if (userConstructor) {
        // @ts-ignore
        constructor.pointsForTeam = userConstructor?.pointsForTeam;
        // @ts-ignore
        constructor.teamPointsHistory = userConstructor?.teamPointsHistory;
      }
    }

    res.status(200).send({ constructor: constructor });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// -------------------------------------------------------------------------------------------------------------------

// Team Functions

// Create a new Team
export const createTeam = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.body?.userId;
    const teamDrivers = req?.body?.teamDrivers;
    const teamConstructors = req?.body?.teamConstructors;
    const teamName = req?.body?.teamName;
    const leagueId = req?.body?.leagueId;
    const price = req?.body?.price;

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
      res.status(403).send({ data: "Maximum number of leagues reached." });
      return;
    }

    // Find league
    const league = await prisma.league.findUnique({
      where: {
        leagueId: leagueId,
      },
      select: { id: true },
    });

    // League is not present
    if (!league) {
      res.status(404).send({ data: "League does not exist." });
      return;
    }

    // Check how many teams the user has added in a league.
    const teamCount = await prisma.team.count({
      where: {
        userId: userinDB?.id,
        leagueId: league?.id,
      },
    });

    // User can add at max "numberOfPossibleTeamsInALeague" teams in a league.
    if (teamCount >= numberOfPossibleTeamsInALeague) {
      res.status(403).send({ data: "You can only create 2 teams per league." });
      return;
    }

    // Get Driver & constructor Ids
    const selectedDrivers = teamDrivers.map((item: any) => item?.driverId);
    const selectedConstructors = teamConstructors.map(
      (item: any) => item?.constructorId
    );

    // Create a Team
    const createdTeam = await prisma.team.create({
      data: {
        name: teamName,
        driverIds: selectedDrivers,
        constructorIds: selectedConstructors,
        userId: userinDB?.id,
        leagueId: league?.id,
        price: price,
      },
    });

    // Create Team drivers
    teamDrivers?.map(async (driver: Driver) => {
      await prisma.driverInTeam.create({
        data: {
          teamId: createdTeam?.id,
          driverId: driver?.driverId,
          permanentNumber: Number(driver?.permanentNumber),
          code: driver?.code,
          price: driver?.price,
          pointsForTeam: 0,
          teamPointsHistory: [],
          constructor_name: driver?.constructor_name,
          constructor_color: driver?.constructor_color,
          familyName: driver?.familyName,
          givenName: driver?.givenName,
          image: driver?.image,
          countryCode: driver?.countryCode,
        },
      });
    });

    // Create Team constructors
    teamConstructors?.map(async (constructor: Constructor) => {
      await prisma.constructorInTeam.create({
        data: {
          teamId: createdTeam?.id,
          constructorNumber: constructor?.constructorNumber,
          constructorId: constructor?.constructorId,
          name: constructor?.name,
          price: constructor?.price,
          pointsForTeam: 0,
          teamPointsHistory: [],
          logo: constructor?.logo,
          carImage: constructor?.carImage,
        },
      });
    });

    // Check number of teams in a league.
    const totalTeamCount = await prisma.team.count();

    // Update team count in league.
    await prisma.league.update({
      where: { id: league?.id },
      data: { numberOfTeams: { increment: 1 } },
    });

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

    // Get team
    const team = await prisma.team.findUnique({
      where: { id: createdTeam?.id },
      include: {
        teamConstructors: true,
        teamDrivers: true,
      },
    });

    res.status(200).send({ data: team });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Get team data by Id
export const getTeamById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const teamId = req?.body?.teamId;

    // If team Id is not passed in request.
    if (!teamId) {
      res.status(404).send({ data: "Team ID required." });
      return;
    }

    // Find team in Database
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        id: true,
        name: true,
        driverIds: true,
        constructorIds: true,
        teamConstructors: { orderBy: { pointsForTeam: "desc" } },
        teamDrivers: { orderBy: { pointsForTeam: "desc" } },
        price: true,
        score: true,
        freeChangeLimit: true,
        League: {
          select: {
            name: true,
            leagueId: true,
            private: true,
          },
        },
        User: {
          select: {
            name: true,
            username: true,
            photoURL: true,
          },
        },
      },
    });

    // If team exists.
    if (team) {
      res.status(200).send({ team: team });
      return;
    }
    // If team does not exist.
    else {
      res.status(404).send({ data: "Team not found" });
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong!" });
    return;
  }
};

// Search for Teams in a League
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
export const editTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const teamId = req?.body?.teamId;
    const userId = req?.body?.userId;
    const teamDrivers = req?.body?.teamDrivers;
    const teamConstructors = req?.body?.teamConstructors;
    const teamName = req?.body?.teamName;
    const price = req?.body?.price;

    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        userId: userId,
      },
    });

    // If team is not present in DB
    if (!team) {
      res.status(404).send({ data: "Team does not exist." });
      return;
    }

    const selectedDrivers = teamDrivers.map((item: any) => item?.driverId);
    const selectedConstructors = teamConstructors.map(
      (item: any) => item?.constructorId
    );

    const newDrivers = teamDrivers?.filter(
      (driver: Driver) => !team?.driverIds?.includes(driver?.driverId)
    );

    const newConstructors: Constructor[] = teamConstructors?.filter(
      (constructor: Constructor) =>
        !team?.constructorIds?.includes(constructor?.constructorId)
    );

    const removedDrivers = team?.driverIds?.filter(
      (driver: string) => !selectedDrivers.includes(driver)
    );

    const removedConstructors = team?.constructorIds?.filter(
      (constructor: string) => !selectedConstructors.includes(constructor)
    );

    let numberOfChanges = 0;
    numberOfChanges += countNumberOfChanges(team?.driverIds, selectedDrivers);
    numberOfChanges += countNumberOfChanges(
      team?.constructorIds,
      selectedConstructors
    );

    let editedTeam;

    if (team?.freeChangeLimit < 0) {
      // Unlimited changes
      editedTeam = await prisma.team.update({
        where: { id: teamId },
        data: {
          name: teamName,
          driverIds: selectedDrivers,
          constructorIds: selectedConstructors,
          price: price,
        },
      });
    } else {
      const changesExceedFreeLimit = numberOfChanges > team.freeChangeLimit;

      const remainingChanges = Math.max(
        team.freeChangeLimit - numberOfChanges,
        0
      );

      editedTeam = await prisma.team.update({
        where: { id: teamId },
        data: {
          name: teamName,
          driverIds: selectedDrivers,
          constructorIds: selectedConstructors,
          price: price,
          freeChangeLimit: changesExceedFreeLimit ? 0 : remainingChanges,
          score: changesExceedFreeLimit
            ? {
                decrement:
                  (numberOfChanges - team.freeChangeLimit) * changeCost,
              }
            : team.score,
        },
      });
    }

    newDrivers?.map(async (driver: Driver) => {
      await prisma.driverInTeam.create({
        data: {
          teamId: editedTeam?.id,
          driverId: driver?.driverId,
          permanentNumber: Number(driver?.permanentNumber),
          code: driver?.code,
          price: driver?.price,
          pointsForTeam: 0,
          teamPointsHistory: [],
          constructor_name: driver?.constructor_name,
          constructor_color: driver?.constructor_color,
          familyName: driver?.familyName,
          givenName: driver?.givenName,
          image: driver?.image,
          countryCode: driver?.countryCode,
        },
      });
    });

    newConstructors?.map(async (constructor: Constructor) => {
      await prisma.constructorInTeam.create({
        data: {
          teamId: editedTeam?.id,
          constructorNumber: constructor?.constructorNumber,
          constructorId: constructor?.constructorId,
          name: constructor?.name,
          price: constructor?.price,
          pointsForTeam: 0,
          teamPointsHistory: [],
          logo: constructor?.logo,
          carImage: constructor?.carImage,
        },
      });
    });

    removedDrivers?.map(async (driver) => {
      await prisma.driverInTeam.deleteMany({
        where: {
          teamId: editedTeam?.id,
          driverId: driver,
        },
      });
    });

    removedConstructors?.map(async (constructorId) => {
      await prisma.constructorInTeam.deleteMany({
        where: {
          teamId: editedTeam?.id,
          constructorId: constructorId,
        },
      });
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

    res.status(200).send({ data: "Team has been edited" });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Edit an existing Team
export const deleteTeam = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const teamId = req.body?.teamId;
    const userId = req?.body?.userId;

    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        userId: userId,
      },
      select: {
        id: true,
        userId: true,
        League: {
          select: {
            id: true,
          },
        },
      },
    });

    // If team is not present in DB
    if (!team) {
      res.status(404).send({ data: "Team does not exist." });
      return;
    }

    // Update League
    await prisma.league.update({
      where: {
        id: team?.League?.id,
      },
      data: {
        numberOfTeams: { decrement: 1 },
      },
    });

    await prisma.driverInTeam.deleteMany({
      where: { teamId: team?.id },
    });

    await prisma.constructorInTeam.deleteMany({
      where: { teamId: team?.id },
    });

    // Delete Team
    await prisma.team.delete({
      where: {
        id: team?.id,
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

    res.status(200).send({ data: "Team deleted." });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// -------------------------------------------------------------------------------------------------------------------------

// League Functions

// Create a new league
export const createLeague = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req?.body?.userId;
    const leagueName = req?.body?.leagueName;
    const isPrivate = req?.body?.isPrivate;

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
export const getCurrentUserTeams = async (
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

    // If user does not exist - send an error.
    if (!user) {
      res.status(404).send({ data: "User not found." });
      return;
    }

    // Get teams where the user is the creator
    const teams = await prisma.team.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        score: true,
        createdAt: true,
        updatedAt: true,
        League: {
          select: {
            name: true,
            leagueId: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip: page * 4,
      take: 4,
    });

    // Check if more teams are present where the user is the creator.
    const nextPageExists = await prisma.team.count({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip: (page + 1) * 4,
      take: 4,
    });

    res
      .status(200)
      .send({ teams: teams, nextPage: nextPageExists != 0 ? page + 1 : null });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
  }
};

// Get all the leagues that the user is in (participant or admin) (Current user)
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
export const getUserPublicTeams = async (
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

    // If user does not exist - send an error.
    if (!user) {
      res.status(404).send({ data: "User not found." });
      return;
    }

    // Get teams where the user is the creator
    const teams = await prisma.team.findMany({
      where: {
        AND: [
          { userId: user.id }, // The user owns the team
          {
            OR: [
              {
                League: { private: false }, // Public leagues are always allowed
              },
              {
                League: {
                  private: true, // Private leagues must have currentUserId present
                  teams: {
                    some: { userId: currentUserId }, // Ensure currentUserId has a team in this league
                  },
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        score: true,
        createdAt: true,
        updatedAt: true,
        League: {
          select: {
            name: true,
            leagueId: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip: page * 4,
      take: 4,
    });

    // Check if more teams are present where the user is the creator.
    const nextPageExists = await prisma.team.count({
      where: {
        AND: [
          { userId: user.id }, // The user owns the team
          {
            OR: [
              {
                League: { private: false }, // Public leagues are always allowed
              },
              {
                League: {
                  private: true, // Private leagues must have currentUserId present
                  teams: {
                    some: { userId: currentUserId }, // Ensure currentUserId has a team in this league
                  },
                },
              },
            ],
          },
        ],
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip: page * 4,
      take: 4,
    });

    res
      .status(200)
      .send({ teams: teams, nextPage: nextPageExists != 0 ? page + 1 : null });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
  }
};

// Find the teams in a league which belong to the current user
export const getCurrentUserTeamsInLeague = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req?.body?.userId;
    const leagueId = req?.body?.leagueId;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      res.status(404).send({ data: "User not found." });
      return;
    }

    // Check if league exists
    const league = await prisma.league.findUnique({
      where: { leagueId },
      select: { id: true },
    });

    if (!league) {
      res.status(404).send({ data: "League not found." });
      return;
    }

    // Get current user's teams in the league
    const userTeams = await prisma.team.findMany({
      where: {
        userId: user.id,
        leagueId: league.id,
      },
      select: {
        id: true,
        name: true,
        score: true,
        createdAt: true,
        updatedAt: true,
        User: {
          select: {
            id: true,
            name: true,
            username: true,
            photoURL: true,
          },
        },
      },
    });

    // For each team, calculate position in league
    const teamsWithPosition = await Promise.all(
      userTeams.map(async (team) => {
        const higherRankCount = await prisma.team.count({
          where: {
            leagueId: league.id,
            OR: [
              { score: { gt: team.score } },
              {
                score: team.score,
                updatedAt: { lt: team.updatedAt },
              },
            ],
          },
        });

        return {
          ...team,
          position: higherRankCount + 1,
        };
      })
    );

    res.status(200).send({ teams: teamsWithPosition });
  } catch (err) {
    console.error(err);
    res.status(500).send({ data: "Something went wrong" });
  }
};

// ------------------------------------------------------------------------------------------------------------------------

// Leaderboard Functions

// Find drivers - sorted by most chosen
export const getMostSelectedDrivers = async (req: Request, res: Response) => {
  try {
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
export const getMostSelectedConstructors = async (
  req: Request,
  res: Response
) => {
  try {
    const constructors = await prisma.constructor.findMany({
      orderBy: [{ chosenPercentage: "desc" }, { points: "desc" }],
      take: 3,
    });

    res.status(200).send({ constructors: constructors });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong" });
  }
};

// Find drivers - sorted by highest scoring
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
export const getHighestScoringConstructors = async (
  req: Request,
  res: Response
) => {
  try {
    const constructors = await prisma.constructor.findMany({
      orderBy: [{ points: "desc" }],
      take: 3,
    });

    res.status(200).send({ constructors: constructors });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong" });
  }
};

// Get the top 3 teams across all leagues
export const getTop3Teams = async (req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { score: "desc" },
      take: 3,
    });

    res.status(200).send({ teams: teams });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong" });
  }
};
