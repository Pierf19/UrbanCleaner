import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveReport = mutation({
  args: {
    score: v.number(),
    category: v.string(),
    recommendation: v.string(),
  },
  handler: async (ctx, args) => {
    const reportId = await ctx.db.insert("reports", {
      score: args.score,
      category: args.category,
      recommendation: args.recommendation,
      createdAt: Date.now(),
    });
    return reportId;
  },
});
