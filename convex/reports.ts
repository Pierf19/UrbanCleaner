import { mutation } from "./_generated/server";
import { query } from "./_generated/server";
import { v } from "convex/values";

export const saveReport = mutation({
  args: {
    score: v.number(),
    category: v.string(),
    recommendation: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reportId = await ctx.db.insert("reports", {
      score: args.score,
      category: args.category,
      recommendation: args.recommendation,
      latitude: args.latitude,
      longitude: args.longitude,
      imageUrl: args.imageUrl,
      createdAt: Date.now(),
    });
    return reportId;
  },
});

export const getReports = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("reports").order("desc").take(100);
  },
});

// ===== Users (Petugas) CRUD =====

export const addUser = mutation({
  args: {
    phone: v.string(),
    name: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const phone = args.phone.startsWith("62") ? args.phone : `62${args.phone}`;
    const userId = await ctx.db.insert("users", {
      phone,
      name: args.name,
      active: args.active,
    });
    return userId;
  },
});

export const updateUser = mutation({
  args: {
    id: v.id("users"),
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.phone) updates.phone = args.phone.startsWith("62") ? args.phone : `62${args.phone}`;
    if (args.name) updates.name = args.name;
    if (args.active !== undefined) updates.active = args.active;
    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const deleteUser = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { status: "deleted" };
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const getActiveUsers = query({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    return allUsers.filter((u) => u.active);
  },
});