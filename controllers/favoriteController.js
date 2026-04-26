import mongoose from "mongoose";
import { Favorite } from "../models/Favorite.js";
import { MenuItem } from "../models/menu.js";
export const getFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const favorites = await Favorite.find({ userId: userId }).populate(
      "menuItemId",
    );

    res.status(200).json({
      success: true,
      count: favorites.length,
      data: favorites,
    });
  } catch (err) {
    return res.status(500).json({
      success:false,
      message:err.message
    })
  }
};

export const toggleFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { menuItemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      const error = new Error("Invalid Item Id");
      error.statusCode = 400;
      throw error;
    }
    const favoriteItem = await Favorite.findOne({
      userId: userId,
      menuItemId: menuItemId,
    });
    if (favoriteItem) {
      await Favorite.findOneAndDelete({ _id: favoriteItem._id });
      return res.status(200).json({
        success: true,
        message: "Item removed from favorite",
      });
    }
    await Favorite.create({
      userId: userId,
      menuItemId: menuItemId,
    });
    return res.status(201).json({
      success: true,
      message: "Item added to favorite.",
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
    success:false,
    message:err.message
  })
  }
};

export const removeFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { menuItemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      const error = new Error("Invalid Item Id");
      error.statusCode = 400;
      throw error;
    }
    const favoriteItem = await Favorite.findOne({
      userId: userId,
      menuItemId: menuItemId,
    });
    if (!favoriteItem) {
      const error = new Error("Item not found");
      error.statusCode = 404;
      throw error;
    }
    await Favorite.findOneAndDelete({ _id: favoriteItem._id });
    res.status(200).json({
      success: true,
      message: "Item removed from favorite",
    });
  } catch (err) {
  return res.status(err.statusCode || 500).json({
    success:false,
    message:err.message
  })
  }
};
