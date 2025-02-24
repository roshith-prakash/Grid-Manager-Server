import { Router } from "express";
import {
  createTeam,
  getDrivers,
  getConstructors,
} from "../controllers/team.controller.ts";

// Create a router.
const router = Router();

// Default route to check if auth routes are accessible.
router.get("/", (_, res) => {
  res.status(200).send({ data: "Auth Route" });
});

// Get the Drivers
router.get("/get-drivers", getDrivers);

// Get the Constructors
router.get("/get-constructors", getConstructors);

// Create a new team for the user.
router.post("/create-team", createTeam);

export default router;
