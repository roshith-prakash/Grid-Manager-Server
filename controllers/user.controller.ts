import { prisma } from "../utils/primsaClient.ts";
import cloudinary from "../utils/cloudinary.ts";
import { Request, Response } from "express";

// Create a new User
export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // If image is uploaded
    if (req?.file) {
      cloudinary.uploader.upload(req.file.path, async function (err, result) {
        if (err) {
          console.log(err);
          return res.status(500).json({
            message: "Something went wrong! Please try again.",
          });
        }
        // If image upload was successful
        else {
          // Get user from request.
          const user = JSON.parse(req.body?.user);

          //Find if user exists in DB
          const checkUser = await prisma.user.findUnique({
            where: {
              email: user?.email,
            },
          });

          if (!checkUser) {
            // Create a user in DB
            const createdUser = await prisma.user.create({
              data: {
                firebaseUID: user?.uid,
                email: user?.email,
                name: user?.name,
                photoURL: result?.secure_url,
                username: user?.username.toLowerCase(),
              },
            });

            // Send the createdUser
            res.status(200).send({ user: createdUser });
            return;
          } else {
            // Send the user in the DB
            res.status(200).send({ user: checkUser });
            return;
          }
        }
      });
    }
    // If image is not uploaded / google image used.
    else {
      const user = JSON.parse(req.body?.user);

      //Find if user exists in DB
      const checkUser = await prisma.user.findUnique({
        where: {
          email: user?.email,
        },
      });

      if (!checkUser) {
        // Create a user in DB
        const createdUser = await prisma.user.create({
          data: {
            firebaseUID: user?.uid,
            email: user?.email,
            name: user?.name,
            photoURL: user?.image,
            username: user?.username.toLowerCase(),
          },
        });

        // Send the createdUser
        res.status(200).send({ user: createdUser });
        return;
      } else {
        // Send the user in the DB
        res.status(200).send({ user: checkUser });
        return;
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Get Current User from DB
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get user info from request.
    const user = req.body?.user;

    // Get the user from DB
    const userInDB = await prisma.user.findUnique({
      where: {
        email: user?.email,
      },
    });

    // If user not present in DB
    if (!userInDB) {
      res.status(404).send({ data: "User does not exist." });
      return;
    }

    res.status(200).send({ user: userInDB });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Get User information
export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get user info from request.
    const username = req.body?.username;

    // Get the user from DB
    const userInDB = await prisma.user.findUnique({
      where: {
        username: username,
      },
      select: {
        name: true,
        username: true,
        createdAt: true,
        photoURL: true,
      },
    });

    // If user not present in DB
    if (!userInDB) {
      res.status(404).send({ data: "User does not exist." });
      return;
    }

    // sending user
    res.status(200).send({ user: userInDB });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Check whether username already exists
export const checkIfUsernameExists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get user info from request.
    const username = req.body?.username;

    // Get the user from DB
    const userInDB = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });

    // If user not present in DB
    if (!userInDB) {
      res.status(200).send({ exists: false });
      return;
    }

    // sending user
    res.status(200).send({ exists: true });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Update the User details - image, name, bio, username updateable0
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // If image is uploaded
    if (req?.file) {
      cloudinary.uploader.upload(req.file.path, async function (err, result) {
        if (err) {
          console.log(err);
          return res.status(500).json({
            message: "Something went wrong! Please try again.",
          });
        }
        // If image upload was successful
        else {
          // Get user from request.
          const updatedUser = JSON.parse(req.body?.updatedUser);

          //Find if user exists in DB
          const checkUser = await prisma.user.findUnique({
            where: {
              id: req?.body?.userId,
            },
          });

          if (!checkUser) {
            // Send an error
            return res.status(404).send({ data: "User Not found" });
          } else {
            // Send the user in the DB
            const user = await prisma.user.update({
              where: {
                id: req?.body?.userId,
              },
              data: {
                username: updatedUser?.username,
                name: updatedUser?.name,
                photoURL: result?.secure_url,
              },
            });
            return res.status(200).send({ user: user });
          }
        }
      });
    }
    // If image is not uploaded / google image used.
    else {
      // Get user from request.
      const updatedUser = JSON.parse(req.body?.updatedUser);

      //Find if user exists in DB
      const checkUser = await prisma.user.findUnique({
        where: {
          id: req?.body?.userId,
        },
      });

      if (!checkUser) {
        // Send an error
        res.status(404).send({ data: "User Not found" });
        return;
      } else {
        // Send the user in the DB
        const user = await prisma.user.update({
          where: {
            id: req?.body?.userId,
          },
          data: {
            username: updatedUser?.username,
            name: updatedUser?.name,
          },
        });

        res.status(200).send({ user: user });
        return;
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Something went wrong." });
    return;
  }
};

// Delete the user & any teams + leagues created by the user.
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const username = req?.body?.username;

    // Find the user along with teams and leagues
    const user = await prisma.user.findUnique({
      where: { username },
      include: { teams: true }, // Get user's teams
    });

    if (!user) {
      res.status(404).send({ data: "User not found." });
      return;
    }

    // Find leagues where the user is either the creator or has a team in
    const leagues = await prisma.league.findMany({
      where: {
        OR: [
          { userId: user.id }, // User created the league
          { teams: { some: { userId: user.id } } }, // User is part of a league
        ],
      },
      select: { id: true, userId: true, numberOfTeams: true }, // Select only necessary fields
    });

    const userCreatedLeagueIds = leagues
      .filter((l) => l.userId === user.id)
      .map((l) => l.id);
    const userJoinedLeagueIds = leagues
      .filter((l) => l.userId !== user.id)
      .map((l) => l.id);

    // Delete teams in leagues the user created
    await prisma.team.deleteMany({
      where: { leagueId: { in: userCreatedLeagueIds } },
    });

    // Delete leagues created by the user
    await prisma.league.deleteMany({
      where: { id: { in: userCreatedLeagueIds } },
    });

    // Delete user's own teams
    await prisma.team.deleteMany({
      where: { userId: user.id },
    });

    // Decrement team count for leagues where the user had a team
    if (userJoinedLeagueIds.length > 0) {
      await prisma.league.updateMany({
        where: { id: { in: userJoinedLeagueIds } },
        data: { numberOfTeams: { decrement: 1 } },
      });
    }

    // Delete the user
    await prisma.user.delete({ where: { id: user.id } });

    res
      .status(200)
      .send({ data: "User and related data deleted successfully." });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).send({ data: "Something went wrong." });
  }
};
