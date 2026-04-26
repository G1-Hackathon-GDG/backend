import express from "express";
import {
  getFavorites,
  removeFavorite,
  toggleFavorite,
} from "../controllers/favoriteController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const favoriteRouter = express.Router();

favoriteRouter.get("/", authMiddleware, getFavorites);
(favoriteRouter.post("/:menuItemId", authMiddleware, toggleFavorite),
  favoriteRouter.delete("/:menuItemId", authMiddleware, removeFavorite));

export default favoriteRouter;
