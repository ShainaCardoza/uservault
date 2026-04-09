/**
 * index-test.js
 * ─────────────────────────────────────────────
 * This script:
 *  1. Connects to MongoDB
 *  2. Drops existing test data
 *  3. Inserts sample users
 *  4. Runs .explain("executionStats") on various queries
 *  5. Prints a detailed report: keys examined, docs examined, execution time
 *
 * Usage: node index-test.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./User");
// ─────────────────────────────────────────────
//  SAMPLE DATA
// ─────────────────────────────────────────────

const sampleUsers = [
  {
    name: "Alice Johnson",
    email: "alice@example.com",
    age: 28,
    hobbies: ["reading", "hiking", "photography"],
    bio: "Alice is a passionate photographer who loves capturing nature.",
  },
  {
    name: "Bob Smith",
    email: "bob@example.com",
    age: 35,
    hobbies: ["gaming", "cooking", "cycling"],
    bio: "Bob enjoys competitive gaming and experimenting with new recipes.",
  },
  {
    name: "Carol White",
    email: "carol@example.com",
    age: 22,
    hobbies: ["painting", "yoga", "reading"],
    bio: "Carol is an aspiring artist who practices yoga every morning.",
  },
  {
    name: "David Brown",
    email: "david@example.com",
    age: 45,
    hobbies: ["hiking", "fishing", "woodworking"],
    bio: "David loves spending weekends outdoors hiking and fishing.",
  },
  {
    name: "Eva Green",
    email: "eva@example.com",
    age: 31,
    hobbies: ["dancing", "cooking", "travel"],
    bio: "Eva is a dance instructor who loves exploring new cuisines while traveling.",
  },
  {
    name: "Frank Miller",
    email: "frank@example.com",
    age: 19,
    hobbies: ["gaming", "music", "skateboarding"],
    bio: "Frank is a young musician who also competes in skateboarding events.",
  },
  {
    name: "Grace Lee",
    email: "grace@example.com",
    age: 55,
    hobbies: ["gardening", "reading", "cooking"],
    bio: "Grace maintains a beautiful garden and enjoys cooking from scratch.",
  },
  {
    name: "Henry Davis",
    email: "henry@example.com",
    age: 40,
    hobbies: ["cycling", "photography", "travel"],
    bio: "Henry documents his cycling adventures through stunning photography.",
  },
  {
    name: "Iris Clark",
    email: "iris@example.com",
    age: 27,
    hobbies: ["yoga", "meditation", "painting"],
    bio: "Iris is a mindfulness coach who expresses creativity through painting.",
  },
  {
    name: "Jack Wilson",
    email: "jack@example.com",
    age: 33,
    hobbies: ["hiking", "gaming", "music"],
    bio: "Jack is an avid hiker who unwinds with video games and guitar.",
  },
];

// ─────────────────────────────────────────────
//  HELPER: FORMAT EXPLAIN OUTPUT
// ─────────────────────────────────────────────

function printStats(label, stats) {
  const es = stats.executionStats;
  const stage = es.executionStages;

  console.log(`\n${"─".repeat(60)}`);
  console.log(`📊  TEST: ${label}`);
  console.log(`${"─".repeat(60)}`);
  console.log(`  ⏱  Execution Time     : ${es.executionTimeMillis} ms`);
  console.log(`  🔑  Keys Examined      : ${es.totalKeysExamined}`);
  console.log(`  📄  Documents Examined : ${es.totalDocsExamined}`);
  console.log(`  ✅  Documents Returned : ${es.nReturned}`);

  // Walk stages for index name
  const findStage = (s) => {
    if (!s) return null;
    if (s.stage === "IXSCAN" || s.stage === "TEXT") return s;
    if (s.inputStage) return findStage(s.inputStage);
    return null;
  };

  const ixStage = findStage(stage);
  if (ixStage) {
    console.log(`  📌  Stage Used         : ${ixStage.stage}`);
    if (ixStage.indexName) {
      console.log(`  🗂  Index Used         : ${ixStage.indexName}`);
    }
  }
  console.log(`${"─".repeat(60)}`);
}

// ─────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────

async function runIndexTests() {
  console.log("\n🔌  Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅  Connected!\n");

  // Clean slate
  console.log("🗑   Clearing existing test data...");
  await User.deleteMany({});

  // Insert sample data
  console.log("📥  Inserting sample users...");
  const inserted = await User.insertMany(sampleUsers);
  console.log(`✅  Inserted ${inserted.length} users\n`);

  // List all indexes
  const indexes = await User.collection.indexes();
  console.log("📑  Indexes on 'users' collection:");
  indexes.forEach((idx) => {
    console.log(
      `    • ${idx.name} → ${JSON.stringify(idx.key)}${
        idx.expireAfterSeconds ? ` (TTL: ${idx.expireAfterSeconds}s)` : ""
      }`
    );
  });

  // ── TEST 1: Single-field index on name ──────────────────
  const t1 = await User.find({ name: /alice/i })
    .explain("executionStats");
  printStats("Single-field index — name search (IXSCAN)", t1);

  // ── TEST 2: Compound index on email + age ───────────────
  const t2 = await User.find({ email: "bob@example.com", age: 35 })
    .explain("executionStats");
  printStats("Compound index — email + age filter (IXSCAN)", t2);

  // ── TEST 3: Multikey index on hobbies ───────────────────
  const t3 = await User.find({ hobbies: { $in: ["hiking"] } })
    .explain("executionStats");
  printStats("Multikey index — hobbies filter (IXSCAN)", t3);

  // ── TEST 4: Text index on bio ────────────────────────────
  const t4 = await User.find({ $text: { $search: "photography" } })
    .explain("executionStats");
  printStats("Text index — bio full-text search (TEXT)", t4);

  // ── TEST 5: Hashed index on userId ──────────────────────
  // Grab a real userId first
  const sample = await User.findOne({});
  const t5 = await User.find({ userId: sample.userId })
    .explain("executionStats");
  printStats("Hashed index — userId equality lookup (IXSCAN)", t5);

  // ── TEST 6: Age range filter (uses compound index) ───────
  const t6 = await User.find({ age: { $gte: 25, $lte: 40 } })
    .explain("executionStats");
  printStats("Age range filter — compound index partial use", t6);

  // ── TEST 7: COLLSCAN baseline (no index used) ────────────
  const t7 = await User.find({ bio: { $exists: true } })
    .explain("executionStats");
  printStats("Baseline — no useful index (COLLSCAN expected)", t7);

  console.log("\n✅  All index tests completed!\n");
  await mongoose.disconnect();
  console.log("🔌  Disconnected from MongoDB\n");
}

runIndexTests().catch((err) => {
  console.error("❌  Test failed:", err);
  process.exit(1);
});
