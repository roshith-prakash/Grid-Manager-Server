import { Request, Response } from "express";
import { prisma } from "../utils/primsaClient.ts";

export const webHookHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req?.body?.data;
    const event = req?.body?.type;

    // When user is deleted
    if (event == "user.deleted") {
      //Find if user exists in DB
      const checkUser = await prisma.user.findUnique({
        where: {
          clerkID: user?.id,
        },
      });

      if (!checkUser) {
        // Send the user in the DB
        res.status(404).send({ data: "User does not exist." });
        console.error("User does not exist");
        return;
      } else {
        const deletedUser = await prisma.user.delete({
          where: {
            clerkID: user?.id,
          },
        });

        console.log("User Deleted :", deletedUser?.username);

        return;
      }
    }

    // Get Primary Email
    const primaryEmail: string | undefined = user.email_addresses.find(
      (email: { id: string; email_address: string; [key: string]: any }) =>
        email.id === user.primary_email_address_id
    )?.email_address;

    if (event && primaryEmail) {
      // When user is created
      if (event == "user.created") {
        const checkUser = await prisma.user.findUnique({
          where: {
            clerkID: user?.id,
          },
        });

        if (!checkUser) {
          // Create a user in DB
          await prisma.user.create({
            data: {
              clerkID: user?.id,
              email: primaryEmail,
              name: user?.first_name + " " + user?.last_name,
              username: user?.username,
            },
          });

          console.log("User Created : ", user?.username);

          return;
        }
      }

      // When user data is updated
      if (event == "user.updated") {
        //Find if user exists in DB
        const checkUser = await prisma.user.findUnique({
          where: {
            clerkID: user?.id,
          },
        });

        if (!checkUser) {
          // Send the user in the DB
          res.status(404).send({ data: "User does not exist." });
          console.error("User does not exist");
          return;
        } else {
          // Create a user in DB
          await prisma.user.update({
            where: {
              clerkID: user?.id,
            },
            data: {
              email: primaryEmail,
              name: user?.first_name + " " + user?.last_name,
              username: user?.username,
            },
          });

          console.log("User Updated : ", user?.username);

          return;
        }
      }
    }
  } catch (error) {
    console.error("Webhook Error :", error);
    res.status(500).send({ error: "Internal Server Error" });
    return;
  }
};
