import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  reports: defineTable({
    score: v.number(),
    category: v.string(),
    recommendation: v.string(),
    createdAt: v.number(),
  }),
});
