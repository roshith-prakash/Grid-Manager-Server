import { v4 as uuidv4 } from "uuid";

export const generateLeagueUID = () => {
  return uuidv4().replace(/-/g, "").substring(0, 6).toUpperCase();
};
