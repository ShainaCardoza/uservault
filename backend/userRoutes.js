const express = require("express");
const router = express.Router();
const User = require("./User");
// ─────────────────────────────────────────────
//  UTILITY
// ─────────────────────────────────────────────

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─────────────────────────────────────────────
//  CREATE — POST /api/users
// ─────────────────────────────────────────────

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, email, age, hobbies, bio } = req.body;

    const user = new User({ name, email, age, hobbies, bio });
    await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  })
);

// ─────────────────────────────────────────────
//  READ ALL — GET /api/users
//  Supports query params:
//    ?name=       — search by name (regex, case-insensitive)
//    ?email=      — exact email match
//    ?age=        — exact age match
//    ?minAge=     — minimum age
//    ?maxAge=     — maximum age
//    ?hobby=      — filter by hobby (multikey index)
//    ?search=     — full-text search on bio (text index)
//    ?page=       — pagination page (default 1)
//    ?limit=      — results per page (default 10)
// ─────────────────────────────────────────────

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      name,
      email,
      age,
      minAge,
      maxAge,
      hobby,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    // Name search — uses single-field index on name
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    // Email filter — uses compound index (email + age)
    if (email) {
      filter.email = email.toLowerCase();
    }

    // Age filter — exact or range; uses compound index
    if (age) {
      filter.age = Number(age);
    } else if (minAge || maxAge) {
      filter.age = {};
      if (minAge) filter.age.$gte = Number(minAge);
      if (maxAge) filter.age.$lte = Number(maxAge);
    }

    // Hobby filter — uses multikey index on hobbies
    if (hobby) {
      filter.hobbies = { $in: [hobby] };
    }
    // Add this near your other filters
    if (req.query.userId) {
        filter.userId = req.query.userId; // Hashed indexes work best with exact equality
    }
    // Text search on bio — uses text index
    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: users,
    });
  })
);

// ─────────────────────────────────────────────
//  READ ONE — GET /api/users/:id
// ─────────────────────────────────────────────

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: user });
  })
);

// ─────────────────────────────────────────────
//  UPDATE — PUT /api/users/:id
// ─────────────────────────────────────────────

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { name, email, age, hobbies, bio } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, age, hobbies, bio },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User updated successfully", data: user });
  })
);

// ─────────────────────────────────────────────
//  DELETE — DELETE /api/users/:id
// ─────────────────────────────────────────────

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully", data: user });
  })
);

// ─────────────────────────────────────────────
//  GET INDEX INFO — GET /api/users/meta/indexes
// ─────────────────────────────────────────────

router.get(
  "/meta/indexes",
  asyncHandler(async (req, res) => {
    const indexes = await User.collection.indexes();
    res.json({ success: true, data: indexes });
  })
);

module.exports = router;
