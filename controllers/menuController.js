import mongoose from "mongoose";
import MenuItem from "../models/MenuItem.js";

const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/menu
export const getMenuItems = async (req, res) => {
  try {
    const menuItems = await MenuItem.find().sort({ createdAt: -1 });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch menu items" });
  }
};

// GET /api/menu/:id
export const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid menu item id" });
    }

    const menuItem = await MenuItem.findById(id);
    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch menu item" });
  }
};

// POST /api/menu
export const createMenuItem = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      image,
      isAvailable,
      preparationTime,
    } = req.body;

    if (
      !name ||
      !description ||
      price === undefined ||
      !category ||
      preparationTime === undefined
    ) {
      return res.status(400).json({
        message:
          "Required fields: name, description, price, category, preparationTime",
      });
    }

    const menuItem = await MenuItem.create({
      name: name.trim(),
      description: description.trim(),
      price,
      category: category.trim(),
      image: image?.trim() || "",
      isAvailable,
      preparationTime,
    });

    res.status(201).json(menuItem);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to create menu item" });
  }
};

// PUT /api/menu/:id
export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid menu item id" });
    }

    const updates = { ...req.body };
    if (typeof updates.name === "string") updates.name = updates.name.trim();
    if (typeof updates.description === "string") {
      updates.description = updates.description.trim();
    }
    if (typeof updates.category === "string") {
      updates.category = updates.category.trim();
    }
    if (typeof updates.image === "string") updates.image = updates.image.trim();

    const menuItem = await MenuItem.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.json(menuItem);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to update menu item" });
  }
};

// DELETE /api/menu/:id
export const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid menu item id" });
    }

    const menuItem = await MenuItem.findByIdAndDelete(id);
    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.json({ message: "Menu item deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete menu item" });
  }
};

// PATCH /api/menu/:id/availability
export const toggleMenuItemAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid menu item id" });
    }

    if (typeof isAvailable !== "boolean") {
      return res
        .status(400)
        .json({ message: "isAvailable must be provided as boolean" });
    }

    const menuItem = await MenuItem.findByIdAndUpdate(
      id,
      { isAvailable },
      { new: true, runValidators: true },
    );

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: "Failed to update availability" });
  }
};
