import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import asyncHandler from "express-async-handler";

export const protect = asyncHandler(async (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    res.status(500);
    throw new Error("JWT_SECRET is not set. Copy .env.example to .env and set it.");
  }

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
     

      const decoded = jwt.verify(token, JWT_SECRET);
     

      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        console.error("No user found in database for given ID");
        res.status(400);
        throw new Error("User not found");
      }

    
      next();
    } catch (error) {
      console.error(`Token validation error: ${error.message}`);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  } else {
    console.error("No token provided in request headers");
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }
});
