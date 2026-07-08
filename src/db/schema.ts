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

// ==================== Chill.Love — знакомства ====================
export const datingProfiles = pgTable(
  "dating_profiles",
  {
    id: serial("id").primaryKey(),
    clientId: text("client_id").notNull(),
    name: text("name").notNull(),
    age: integer("age").notNull().default(18),
    gender: text("gender").notNull(), // male | female
    orientation: text("orientation").notNull().default("hetero"), // hetero | homo | bi
    lookingFor: text("looking_for").notNull().default("female"), // male | female | any
    city: text("city").notNull().default(""),
    goal: text("goal").notNull().default(""), // дружба | отношения | общение | свидание
    bio: text("bio").notNull().default(""),
    photo: text("photo").notNull().default(""), // data URL
    minAge: integer("min_age").notNull().default(18),
    maxAge: integer("max_age").notNull().default(60),
    premium: integer("premium").notNull().default(0),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    password: text("password").notNull().default(""),
    verified: integer("verified").notNull().default(0),
    hidden: text("hidden").notNull().default("[]"), // JSON: скрытые поля
    adult: integer("adult").notNull().default(0), // 1 = 18+ контент
    photos: text("photos").notNull().default(""), // JSON массив data URL (доп. фото)
    videos: text("videos").notNull().default(""), // JSON массив data URL
    privatePhotos: text("private_photos").notNull().default(""), // платные
    priceTip: integer("price_tip").notNull().default(100), // мин. чаевые
    pricePrivate: integer("price_private").notNull().default(300), // приват-контент
    priceCall: integer("price_call").notNull().default(500), // доступ к телефону
    topUntil: timestamp("top_until", { withTimezone: true }), // продвижение в топ
    earnings: integer("earnings").notNull().default(0), // заработок (коп.)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clientIdx: uniqueIndex("dating_profiles_client_idx").on(table.clientId),
    cityIdx: index("dating_profiles_city_idx").on(table.city),
  })
);

export const datingMessages = pgTable(
  "dating_messages",
  {
    id: serial("id").primaryKey(),
    fromClientId: text("from_client_id").notNull(),
    toClientId: text("to_client_id").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pairIdx: index("dating_messages_pair_idx").on(
      table.fromClientId,
      table.toClientId
    ),
  })
);

export const datingLikes = pgTable(
  "dating_likes",
  {
    id: serial("id").primaryKey(),
    fromClientId: text("from_client_id").notNull(),
    toProfileId: integer("to_profile_id").notNull(),
    value: integer("value").notNull().default(1), // рейтинг 1..5
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueLike: uniqueIndex("dating_likes_unique").on(
      table.fromClientId,
      table.toProfileId
    ),
  })
);

export const datingPayments = pgTable(
  "dating_payments",
  {
    id: serial("id").primaryKey(),
    payerClientId: text("payer_client_id").notNull(),
    targetProfileId: integer("target_profile_id").notNull(),
    kind: text("kind").notNull(), // tip | private | call | top | premium
    amount: integer("amount").notNull(), // рубли
    earnerShare: integer("earner_share").notNull().default(0), // 70%
    platformShare: integer("platform_share").notNull().default(0), // 30%
    label: text("label").notNull().default(""), // yoomoney label
    status: text("status").notNull().default("pending"), // pending | paid
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    labelIdx: uniqueIndex("dating_payments_label_idx").on(table.label),
    targetIdx: index("dating_payments_target_idx").on(table.targetProfileId),
  })
);

// Микроблог
export const datingPosts = pgTable(
  "dating_posts",
  {
    id: serial("id").primaryKey(),
    clientId: text("client_id").notNull(),
    text: text("text").notNull().default(""),
    image: text("image").notNull().default(""),
    likes: integer("likes").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clientIdx: index("dating_posts_client_idx").on(table.clientId),
  })
);

// Друзья
export const datingFriends = pgTable(
  "dating_friends",
  {
    id: serial("id").primaryKey(),
    fromClientId: text("from_client_id").notNull(),
    toClientId: text("to_client_id").notNull(),
    status: text("status").notNull().default("pending"), // pending | accepted
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pairIdx: uniqueIndex("dating_friends_pair_idx").on(
      table.fromClientId,
      table.toClientId
    ),
  })
);

// Лайки фото
export const datingPhotoLikes = pgTable(
  "dating_photo_likes",
  {
    id: serial("id").primaryKey(),
    fromClientId: text("from_client_id").notNull(),
    profileId: integer("profile_id").notNull(),
    photoIndex: integer("photo_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueLike: uniqueIndex("dating_photo_likes_unique").on(
      table.fromClientId,
      table.profileId,
      table.photoIndex
    ),
  })
);

// Коды подтверждения регистрации (телефон / email)
export const verifyCodes = pgTable("verify_codes", {
  id: serial("id").primaryKey(),
  contact: text("contact").notNull(), // телефон или email
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Выплаты исполнителям
export const datingPayouts = pgTable("dating_payouts", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  profileName: text("profile_name").notNull().default(""),
  amount: integer("amount").notNull(), // рубли
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DatingProfile = typeof datingProfiles.$inferSelect;
export type DatingMessage = typeof datingMessages.$inferSelect;
export type DatingLike = typeof datingLikes.$inferSelect;
export type DatingPayment = typeof datingPayments.$inferSelect;
export type DatingPayout = typeof datingPayouts.$inferSelect;
// Онлайн-трансляции
export const liveStreams = pgTable(
  "live_streams",
  {
    id: serial("id").primaryKey(),
    clientId: text("client_id").notNull(),
    name: text("name").notNull().default(""),
    photo: text("photo").notNull().default(""),
    title: text("title").notNull().default(""),
    isLive: integer("is_live").notNull().default(0),
    viewers: integer("viewers").notNull().default(0),
    likes: integer("likes").notNull().default(0),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clientIdx: uniqueIndex("live_streams_client_idx").on(table.clientId),
  })
);

// Чат трансляции (сообщения / чаевые / лайки)
export const liveChat = pgTable(
  "live_chat",
  {
    id: serial("id").primaryKey(),
    streamId: integer("stream_id").notNull(),
    name: text("name").notNull().default("Гость"),
    text: text("text").notNull().default(""),
    kind: text("kind").notNull().default("message"), // message | tip | like
    amount: integer("amount").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    streamIdx: index("live_chat_stream_idx").on(table.streamId),
  })
);

export type DatingPost = typeof datingPosts.$inferSelect;
export type DatingFriend = typeof datingFriends.$inferSelect;
export type LiveStream = typeof liveStreams.$inferSelect;
export type LiveChatRow = typeof liveChat.$inferSelect;

export const feedbackMessages = pgTable("feedback_messages", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull().default(""),
  fromContact: text("from_contact").notNull().default(""),
  subject: text("subject").notNull().default(""),
  message: text("message").notNull(),
  reply: text("reply").notNull().default(""),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type FeedbackMessage = typeof feedbackMessages.$inferSelect;
export type TrackVote = typeof trackVotes.$inferSelect;
export type MessageReaction = typeof messageReactions.$inferSelect;
