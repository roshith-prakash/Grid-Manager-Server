import { Router } from "express";
import { createTeam, getDrivers } from "../controllers/team.controller.ts";

// Create a router.
const router = Router();

// Default route to check if auth routes are accessible.
router.get("/", (_, res) => {
  res.status(200).send({ data: "Auth Route" });
});

//
router.get("/get-drivers", getDrivers);

// Create a new team for the user.
router.post("/create-team", createTeam);

export default router;
