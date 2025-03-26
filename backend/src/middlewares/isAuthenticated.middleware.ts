import { NextFunction, Request, Response } from "express";
import { UnauthorizedException } from "../utils/appError";

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if(!req.user || !req.user._id) {
        throw new UnauthorizedException("Unauthorized Access");
    }
    next();
};

export default isAuthenticated;
