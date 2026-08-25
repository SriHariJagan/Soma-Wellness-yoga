import mongoose from "mongoose";
import {
  NOTIFICATION_TYPES,
  PRIORITY_LEVELS,
  NOTIFICATION_STATUSES,
} from "../shared/constants/index.js";

const NotificationSchema = new mongoose.Schema(
  {
    // ── Core ──
    email: { type: String, required: true, default: "system" },
    title: { type: String, default: "" },
    message: { type: String, required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "general" },
    priority: { type: String, enum: PRIORITY_LEVELS, default: "normal" },
    status: {
      type: String,
      enum: NOTIFICATION_STATUSES,
      default: "pending",
      index: true,
    },

    // ── Recipients ──
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    recipientEmail: { type: String, default: "" },

    // ── Delivery ──
    read: { type: Boolean, default: false, index: true },
    channels: { type: [String], default: ["email"] },
    scheduledAt: { type: Date, default: null, index: true },

    // ── Content ──
    subject: { type: String, default: "" },
    richMessage: { type: String, default: "" },
    template: { type: String, default: "" },
    templateData: { type: Object, default: {} },
    correlationId: { type: String, default: "" },

    // ── References ──
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    url: { type: String, default: "" },
    route: { type: String, default: "" },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },
    workshop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workshop",
      default: null,
    },
    workshopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workshop",
      default: null,
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Download",
      default: null,
    },
    assetName: { type: String, default: "" },
    category: { type: String, default: "" },
    link: { type: String, default: "" },
    recipientCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ sender: 1, createdAt: -1 });
NotificationSchema.index({ email: 1 });
NotificationSchema.index({ type: 1 });

const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
export default Notification;
