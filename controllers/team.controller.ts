import { prisma } from "../utils/primsaClient.ts";
import { Request, Response } from "express";
import { generateLeagueUID } from "../utils/generateLeagueUID.ts";

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
    const price = req?.body?.price;

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

    teamDrivers?.forEach((item: any) => (item.points = 0));
    teamConstructors?.forEach((item: any) => (item.points = 0));

    const createdTeam = await prisma.team.create({
      data: {
        name: teamName,
        teamDrivers: teamDrivers,
        teamConstructors: teamConstructors,
        driverIds: selectedDrivers,
        constructorIds: selectedConstructors,
        userId: userinDB?.id,
        leagueId: league?.id,
        price: price,
      },
    });

    await prisma.league.update({
      where: { id: league?.id },
      data: { numberOfTeams: { increment: 1 } },
    });

    res.status(200).send({ data: createdTeam });
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

    if (!teamId) {
      res.status(404).send({ data: "Team ID required" });
      return;
    }

    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        id: true,
        name: true,
        driverIds: true,
        constructorIds: true,
        teamConstructors: true,
        teamDrivers: true,
        price: true,
        score: true,
        League: {
          select: {
            name: true,
            leagueId: true,
            private: true,
          },
        },
      },
    });

    if (team) {
      res.status(200).send({ team: team });
      return;
    } else {
      res.status(404).send({ data: "Team ID required" });
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong!" });
    return;
  }
};

// Get all Teams for the user (Current user)
export const getUserTeams = async (
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

// Get all Public Teams for a user (Non current user)
export const getUserPublicTeams = async (
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
        League: {
          private: false,
        },
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
        League: {
          private: false,
        },
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

// Edit an existing Team
export const editTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const teamId = req.body?.teamId;
    const teamDrivers = req?.body?.teamDrivers;
    const teamConstructors = req?.body?.teamConstructors;
    const teamName = req?.body?.teamName;
    const price = req?.body?.price;

    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
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

    const editedTeam = await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        name: teamName,
        teamDrivers: teamDrivers,
        teamConstructors: teamConstructors,
        driverIds: selectedDrivers,
        constructorIds: selectedConstructors,
        price: price,
      },
    });

    res.status(200).send({ data: editedTeam });
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

    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        id: true,
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

    await prisma.league.update({
      where: {
        id: team?.League?.id,
      },
      data: {
        numberOfTeams: { decrement: 1 },
      },
    });

    await prisma.team.delete({
      where: {
        id: team?.id,
      },
    });

    res.status(200).send({ data: "Team deleted." });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

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
      orderBy: { numberOfTeams: "desc" },
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

// Get all the leagues that the user is in (participant or admin) (Current user)
export const getUserLeagues = async (
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
        private: false,
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
        private: false,
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
