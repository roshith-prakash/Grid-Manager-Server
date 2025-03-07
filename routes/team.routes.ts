import { Router } from "express";
import {
  createTeam,
  getDrivers,
  getConstructors,
  createLeague,
  getLeague,
  getPublicLeagues,
  searchPublicLeagues,
  getTeamsInaLeague,
  getUserTeams,
  getUserLeagues,
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

// Get Teams in a League
router.post("/get-teams-in-a-league", getTeamsInaLeague);

// Get Teams for a User
router.post("/get-user-teams", getUserTeams);

// Get Leagues in which a User's teams are present
router.post("/get-user-leagues", getUserLeagues);

export default router;
