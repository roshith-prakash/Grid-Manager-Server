import { Request, Response } from "express";

// Example Controller Function
export const getName = async (req: Request, res: Response): Promise<void> => {
  try {
    //Add your controller specific code here
    res.status(200).send("John Doe");
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send("Something went wrong!");
    return;
  }
};