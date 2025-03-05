import { Router } from "express";
import {
  createTeam,
  getDrivers,
  getConstructors,
  createLeague,
  getLeague,
  getPublicLeagues,
  searchPublicLeagues,
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

// Create a new league
router.post("/create-league", createLeague);

// Get league by Id
router.post("/get-league", getLeague);

// Get public leagues
router.post("/get-public-leagues", getPublicLeagues);

// Search public leagues
router.post("/search-public-leagues", searchPublicLeagues);

export default router;
