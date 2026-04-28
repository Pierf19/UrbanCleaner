import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    phone: v.string(),
    name: v.string(),
    active: v.boolean(),
  }),
  reports: defineTable({
    score: v.number(),
    category: v.string(),
    recommendation: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  }),
});
