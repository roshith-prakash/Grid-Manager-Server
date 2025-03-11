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
  getCurrentUserTeams,
  getCurrentUserLeagues,
  getUserPublicTeams,
  getUserPublicLeagues,
  getTeamById,
  editTeam,
  deleteTeam,
  updateLeague,
  deleteLeague,
  getCurrentUserTeamsInLeague,
} from "../controllers/team.controller.ts";

// Create a router.
const router = Router();

// Default route to check if auth routes are accessible.
router.get("/", (_, res) => {
  res.status(200).send({ data: "Auth Route" });
});

// ------------------------------------------------------------------

// DRIVERS & CONSTRUCTORS

// Get the Drivers
router.get("/get-drivers", getDrivers);

// Get the Constructors
router.get("/get-constructors", getConstructors);

// ------------------------------------------------------------------

// TEAM ROUTES

// Create a new team for the user.
router.post("/create-team", createTeam);

// Get team by Id.
router.post("/get-team-by-id", getTeamById);

// Edit an existing team.
router.post("/edit-team", editTeam);

// Edit an existing team.
router.post("/delete-team", deleteTeam);

// Get Teams in a League
router.post("/get-teams-in-a-league", getTeamsInaLeague);

// Get Teams for a User
router.post("/get-user-teams", getCurrentUserTeams);

// Get Public Teams for a User (non current user)
router.post("/get-user-public-teams", getUserPublicTeams);

// Get Teams in a League for a User (Current user)
router.post("/get-user-league-teams", getCurrentUserTeamsInLeague);

// ------------------------------------------------------------------

// LEAGUE ROUTES

// Create a new league
router.post("/create-league", createLeague);

// Get league by Id
router.post("/get-league", getLeague);

// Update league
router.post("/update-league", updateLeague);

// Delete league
router.post("/delete-league", deleteLeague);

// Get public leagues
router.post("/get-public-leagues", getPublicLeagues);

// Search public leagues
router.post("/search-public-leagues", searchPublicLeagues);

// Get Leagues in which a User's teams are present
router.post("/get-user-leagues", getCurrentUserLeagues);

// Get Public Leagues in which a User's teams are present (non current user)
router.post("/get-user-public-leagues", getUserPublicLeagues);

// ------------------------------------------------------------------

export default router;
