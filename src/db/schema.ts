import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    text: text("text").notNull(),
    color: text("color").notNull().default("#5eead4"),
    replyToId: integer("reply_to_id"),
    replyToName: text("reply_to_name"),
    replyToText: text("reply_to_text"),
    attachmentType: text("attachment_type"), // image | audio | video | file
    attachmentUrl: text("attachment_url"), // data URL
    attachmentName: text("attachment_name"),
    room: text("room").notNull().default("main"), // main | premium
    isPremium: integer("is_premium").notNull().default(0), // 1 = автор премиум
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("chat_messages_created_at_idx").on(table.createdAt),
  })
);

export const trackVotes = pgTable(
  "track_votes",
  {
    id: serial("id").primaryKey(),
    songid: text("songid").notNull(),
    clientId: text("client_id").notNull(),
    value: integer("value").notNull(), // 1 = up, -1 = down
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    songidIdx: index("track_votes_songid_idx").on(table.songid),
    uniqueVote: uniqueIndex("track_votes_song_client_unique").on(
      table.songid,
      table.clientId
    ),
  })
);

export const messageReactions = pgTable(
  "message_reactions",
  {
    id: serial("id").primaryKey(),
    messageId: integer("message_id").notNull(),
    clientId: text("client_id").notNull(),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    messageIdx: index("message_reactions_message_idx").on(table.messageId),
    uniqueReaction: uniqueIndex("message_reactions_unique").on(
      table.messageId,
      table.clientId,
      table.emoji
    ),
  })
);

export const premiumSubscribers = pgTable(
  "premium_subscribers",
  {
    id: serial("id").primaryKey(),
    vkUserId: text("vk_user_id").notNull(),
    status: text("status").notNull().default("active"), // active | expired
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    vkIdIdx: uniqueIndex("premium_subscribers_vk_id_idx").on(table.vkUserId),
  })
);

export type PremiumSubscriber = typeof premiumSubscribers.$inferSelect;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type TrackVote = typeof trackVotes.$inferSelect;
export type MessageReaction = typeof messageReactions.$inferSelect;
