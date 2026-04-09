const mongoose = require("mongoose");
const { v4: uuidv4 } = require("crypto").randomUUID
  ? { v4: () => require("crypto").randomUUID() }
  : { v4: () => Math.random().toString(36).substr(2, 9) };

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      minlength: [3, "Name must be at least 3 characters long"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email address`,
      },
    },

    age: {
      type: Number,
      min: [0, "Age cannot be negative"],
      max: [120, "Age cannot exceed 120"],
      default: null,
    },

    hobbies: {
      type: [String],
      default: [],
    },

    bio: {
      type: String,
      default: "",
      trim: true,
    },

    userId: {
      type: String,
      required: true,
      default: () =>
        require("crypto").randomBytes(16).toString("hex"),
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We manage createdAt manually for TTL
    versionKey: false,
  }
);

// ─────────────────────────────────────────────
//  INDEX DEFINITIONS
// ─────────────────────────────────────────────

// 1. Single-field index on name (for fast name searches)
userSchema.index({ name: 1 }, { name: "idx_name_single" });

// 2. Compound index on email and age
userSchema.index(
  { email: 1, age: 1 },
  { name: "idx_email_age_compound" }
);

// 3. Multikey index on hobbies (auto-created for arrays)
userSchema.index({ hobbies: 1 }, { name: "idx_hobbies_multikey" });

// 4. Text index on bio (enables full-text search)
userSchema.index({ bio: "text" }, { name: "idx_bio_text" });

// 5. Hashed index on userId (for equality lookups, sharding-ready)
userSchema.index({ userId: "hashed" }, { name: "idx_userId_hashed" });

// 6. TTL index on createdAt — documents expire after 1 year (31536000 seconds)
//    Change expireAfterSeconds to test (e.g., 60 = 1 minute)
userSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 31536000, name: "idx_createdAt_ttl" }
);

// ─────────────────────────────────────────────
//  INSTANCE METHODS
// ─────────────────────────────────────────────

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  return obj;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
