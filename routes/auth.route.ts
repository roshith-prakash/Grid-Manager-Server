import {
  getCurrentUser,
  getUserProfile,
} from "../controllers/auth.controller.ts";
import { Router } from "express";

// Create a router.
const authRouter = Router();

// Default route to check if auth routes are accessible.
authRouter.get("/", (_, res) => {
  res.status(200).send({ data: "Auth Route" });
});

// Get the current user from the DB.
authRouter.post("/get-current-user", getCurrentUser);

// Get the user information from the DB.
authRouter.post("/get-user-info", getUserProfile);

export default authRouter;
