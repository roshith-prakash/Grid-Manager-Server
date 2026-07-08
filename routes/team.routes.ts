import { Router } from "express";
import {
  getDrivers,
  getMostSelectedDrivers,
  getHighestScoringDrivers,
  getDriverStats,
} from "../controllers/driver.controller.ts";

import {
  getConstructors,
  getMostSelectedConstructors,
  getHighestScoringConstructors,
  getConstructorStats,
} from "../controllers/constructor.controller.ts";

import {
  createLeague,
  getPublicLeagues,
  searchPublicLeagues,
  getLeague,
  updateLeague,
  deleteLeague,
  checkIfUserCanJoinLeague,
  getCurrentUserLeagues,
  getUserPublicLeagues,
  getTeamsInaLeague,
} from "../controllers/league.controller.ts";

import {
  createTeam,
  getTeamById,
  editTeam,
  deleteTeam,
  getCurrentUserTeams,
  getUserPublicTeams,
  getCurrentUserTeamsInLeague,
  getTop3Teams,
  getTransferHistory,
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
router.post("/get-drivers", getDrivers);

// Get the Constructors
router.post("/get-constructors", getConstructors);

// Get the Drivers
router.post("/get-drivers-stats", getDriverStats);

// Get the Constructors
router.post("/get-constructors-stats", getConstructorStats);

// ------------------------------------------------------------------

// TEAM ROUTES

// Create a new team for the user.
router.post("/create-team", createTeam);

// Get Transfer History for a team
// Get a team transfer history
router.post("/get-transfer-history", getTransferHistory);

// Get team by Id.
router.post("/get-team-by-id", getTeamById);

// Edit an existing team.
router.post("/edit-team", editTeam);

// Delete a Team
router.post("/delete-team", deleteTeam);

// Leave a League (Deletes all user teams in that league)
// Leave a league

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
router.post("/edit-league", updateLeague);

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

// Check if user has not exceeded maximum number of leagues
router.post("/check-if-user-can-join-league", checkIfUserCanJoinLeague);

// ------------------------------------------------------------------

// Leaderboard Routes

// Get the 3 most selected drivers
router.post("/get-most-selected-drivers", getMostSelectedDrivers);

// Get the 3 most selected constructors
router.post("/get-most-selected-constructors", getMostSelectedConstructors);

// Get the 3 highest scoring drivers
router.post("/get-highest-scoring-drivers", getHighestScoringDrivers);

// Get the 3 highest scoring constructors
router.post("/get-highest-scoring-constructors", getHighestScoringConstructors);

// Get top 3 teams
router.post("/get-top-3-teams", getTop3Teams);

// ------------------------------------------------------------------

export default router;
