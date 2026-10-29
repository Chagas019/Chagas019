import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ------------------------------------------------------------------ */
/* Autenticação (tabelas exigidas pelo Better Auth)                    */
/* ------------------------------------------------------------------ */

export const userRole = pgEnum("user_role", ["user", "moderator", "admin"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRole("role").notNull().default("user"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  /** Timestamp em milissegundos (não cabe em integer). */
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/** Rate limit das ações da aplicação (janela fixa). */
export const appRateLimit = pgTable("app_rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Perfil                                                              */
/* ------------------------------------------------------------------ */

export type ProfileLink = { label: string; url: string };
export type NotificationPrefs = {
  collab?: boolean;
  mention?: boolean;
  follow: boolean;
  comment: boolean;
  reply: boolean;
  like: boolean;
  challenge: boolean;
  community: boolean;
};

export const defaultNotificationPrefs: NotificationPrefs = {
  follow: true,
  comment: true,
  reply: true,
  like: false,
  challenge: true,
  community: true,
};

export const profile = pgTable(
  "profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    avatarMediaId: uuid("avatar_media_id"),
    coverMediaId: uuid("cover_media_id"),
    specialties: text("specialties").array().notNull().default(sql`'{}'::text[]`),
    interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
    location: text("location"),
    showLocation: boolean("show_location").notNull().default(false),
    links: jsonb("links").$type<ProfileLink[]>().notNull().default([]),
    gear: text("gear").notNull().default(""),
    tools: text("tools").array().notNull().default(sql`'{}'::text[]`),
    availableForWork: boolean("available_for_work").notNull().default(false),
    contactEmail: text("contact_email"),
    /** Quem pode ver o e-mail de contato: ninguém, quem está logado, ou quem eu sigo. */
    contactVisibility: text("contact_visibility", { enum: ["nobody", "members", "following"] })
      .notNull()
      .default("nobody"),
    isIndexable: boolean("is_indexable").notNull().default(false),
    /** Aprova automaticamente novos seguidores para conteúdo "só seguidores". Desligado por padrão. */
    autoApproveFollowers: boolean("auto_approve_followers").notNull().default(false),
    /** Quem pode iniciar conversa: todos, quem eu sigo, ou ninguém (colaborações aceitas sempre podem). */
    messagesFrom: text("messages_from", { enum: ["everyone", "following", "nobody"] }).notNull().default("following"),
    accentColor: text("accent_color", { enum: ["violet", "blue", "ember", "mint"] })
      .notNull()
      .default("violet"),
    notificationPrefs: jsonb("notification_prefs")
      .$type<NotificationPrefs>()
      .notNull()
      .default(defaultNotificationPrefs),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    followerCount: integer("follower_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("profile_handle_unique").on(sql`lower(${t.handle})`)],
);

/* ------------------------------------------------------------------ */
/* Publicações                                                         */
/* ------------------------------------------------------------------ */

export const postKind = pgEnum("post_kind", ["work", "showcase", "tutorial", "discussion"]);
export const postFormat = pgEnum("post_format", [
  "photo",
  "carousel",
  "video",
  "before_after",
  "making_of",
  "breakdown",
  "project",
  "lighting_study",
  "behind_the_scenes",
  "text",
]);
export const visibility = pgEnum("visibility", ["public", "followers", "private"]);
export const contentStatus = pgEnum("content_status", ["published", "removed", "draft"]);

export const community = pgTable(
  "community",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    rules: text("rules").notNull().default(""),
    categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
    access: text("access", { enum: ["public", "private", "invite"] }).notNull().default("public"),
    inviteCode: text("invite_code").notNull(),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
    memberCount: integer("member_count").notNull().default(0),
    status: contentStatus("status").notNull().default("published"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("community_access_idx").on(t.access, t.status)],
);

export const post = pgTable(
  "post",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: postKind("kind").notNull().default("work"),
    format: postFormat("format").notNull().default("photo"),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
    tools: text("tools").array().notNull().default(sql`'{}'::text[]`),
    visibility: visibility("visibility").notNull().default("public"),
    status: contentStatus("status").notNull().default("published"),
    isCollaborative: boolean("is_collaborative").notNull().default(false),
    communityId: uuid("community_id").references(() => community.id, { onDelete: "cascade" }),
    /** Hashtags extraídas do título e da legenda, sem "#", em minúsculas. */
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    credits: jsonb("credits").$type<Credit[]>().notNull().default([]),
    commentsEnabled: boolean("comments_enabled").notNull().default(true),
    /** Fixado no portfólio do autor (destaques do perfil). */
    pinnedAt: timestamp("pinned_at", { withTimezone: true }),
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    saveCount: integer("save_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("post_feed_idx").on(t.status, t.visibility, t.createdAt),
    index("post_author_idx").on(t.authorId, t.createdAt),
    index("post_community_idx").on(t.communityId, t.createdAt),
    index("post_categories_idx").using("gin", t.categories),
    index("post_tags_idx").using("gin", t.tags),
  ],
);

export const mediaKind = pgEnum("media_kind", ["image", "video"]);

/** Metadados de arquivos. Os bytes ficam no storage (disco local ou Vercel Blob privado). */
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => post.id, { onDelete: "cascade" }),
    purpose: text("purpose", {
      enum: ["post", "avatar", "cover", "showcase_before", "showcase_after"],
    }).notNull(),
    position: integer("position").notNull().default(0),
    kind: mediaKind("kind").notNull(),
    mimeType: text("mime_type").notNull(),
    storageKey: text("storage_key").notNull(),
    thumbKey: text("thumb_key"),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes").notNull(),
    alt: text("alt").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("media_post_idx").on(t.postId, t.position), index("media_owner_idx").on(t.ownerId)],
);

/** Crédito de um projeto; `handle` marca um criador do FRAME (gera notificação e link). */
export type Credit = { name: string; role: string; handle?: string };

export const showcase = pgTable("showcase", {
  postId: uuid("post_id")
    .primaryKey()
    .references(() => post.id, { onDelete: "cascade" }),
  beforeMediaId: uuid("before_media_id").references(() => media.id, { onDelete: "set null" }),
  afterMediaId: uuid("after_media_id").references(() => media.id, { onDelete: "set null" }),
  process: text("process").notNull().default(""),
  camera: text("camera").notNull().default(""),
  lens: text("lens").notNull().default(""),
  lighting: text("lighting").notNull().default(""),
  software: text("software").array().notNull().default(sql`'{}'::text[]`),
  presetName: text("preset_name").notNull().default(""),
  editParams: text("edit_params").notNull().default(""),
  credits: jsonb("credits").$type<Credit[]>().notNull().default([]),
  portfolioUrl: text("portfolio_url"),
  hideTechnical: boolean("hide_technical").notNull().default(false),
});

export type TutorialStep = { title: string; body: string };
export type ResourceLink = { label: string; url: string };

export const tutorialLevel = pgEnum("tutorial_level", ["iniciante", "intermediario", "avancado"]);

export const tutorial = pgTable(
  "tutorial",
  {
    postId: uuid("post_id")
      .primaryKey()
      .references(() => post.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    level: tutorialLevel("level").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    software: text("software").notNull().default(""),
    steps: jsonb("steps").$type<TutorialStep[]>().notNull().default([]),
    resources: jsonb("resources").$type<ResourceLink[]>().notNull().default([]),
    helpfulCount: integer("helpful_count").notNull().default(0),
  },
  (t) => [index("tutorial_topic_idx").on(t.topic, t.level)],
);

export const tutorialRating = pgTable(
  "tutorial_rating",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    helpful: boolean("helpful").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })],
);

export const comment = pgTable(
  "comment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    body: text("body").notNull(),
    status: contentStatus("status").notNull().default("published"),
    createdAt: createdAt(),
  },
  (t) => [index("comment_post_idx").on(t.postId, t.createdAt)],
);

export const reaction = pgTable(
  "reaction",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] }), index("reaction_user_idx").on(t.userId)],
);

export const follow = pgTable(
  "follow",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Aprovado pelo perfil seguido: libera publicações "só seguidores". Seguir em si é instantâneo. */
    approved: boolean("approved").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follow_following_idx").on(t.followingId),
    check("follow_not_self", sql`${t.followerId} <> ${t.followingId}`),
  ],
);

export const collection = pgTable(
  "collection",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("collection_owner_idx").on(t.ownerId)],
);

export const savedItem = pgTable(
  "saved_item",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id").references(() => collection.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] }), index("saved_collection_idx").on(t.collectionId)],
);

/* ------------------------------------------------------------------ */
/* Comunidades                                                         */
/* ------------------------------------------------------------------ */

export const communityMember = pgTable(
  "community_member",
  {
    communityId: uuid("community_id")
      .notNull()
      .references(() => community.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "member"] }).notNull().default("member"),
    status: text("status", { enum: ["active", "pending", "banned"] }).notNull().default("active"),
    notify: boolean("notify").notNull().default(true),
    joinedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.communityId, t.userId] }), index("member_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Creative Battles                                                    */
/* ------------------------------------------------------------------ */

export const challenge = pgTable("challenge", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  theme: text("theme").notNull(),
  briefing: text("briefing").notNull(),
  rules: text("rules").array().notNull().default(sql`'{}'::text[]`),
  category: text("category").notNull(),
  level: text("level", { enum: ["iniciante", "profissional", "todos"] }).notNull().default("todos"),
  cadence: text("cadence", { enum: ["semanal", "mensal"] }).notNull().default("semanal"),
  palette: text("palette").array().notNull().default(sql`'{}'::text[]`),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  submissionDeadline: timestamp("submission_deadline", { withTimezone: true }).notNull(),
  votingEnabled: boolean("voting_enabled").notNull().default(true),
  votingEndsAt: timestamp("voting_ends_at", { withTimezone: true }),
  maxVotesPerUser: integer("max_votes_per_user").notNull().default(3),
  communityId: uuid("community_id").references(() => community.id, { onDelete: "cascade" }),
  createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const challengeSubmission = pgTable(
  "challenge_submission",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenge.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    note: text("note").notNull().default(""),
    voteCount: integer("vote_count").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("submission_one_per_user").on(t.challengeId, t.userId)],
);

export const challengeVote = pgTable(
  "challenge_vote",
  {
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => challengeSubmission.id, { onDelete: "cascade" }),
    voterId: text("voter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenge.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.submissionId, t.voterId] }),
    index("vote_challenge_voter_idx").on(t.challengeId, t.voterId),
  ],
);

/* ------------------------------------------------------------------ */
/* Notificações, moderação, segurança                                  */
/* ------------------------------------------------------------------ */

export const notificationType = pgEnum("notification_type", [
  "follow",
  "comment",
  "reply",
  "like",
  "challenge",
  "community",
  "collab",
  "mention",
]);

export const notification = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    postId: uuid("post_id").references(() => post.id, { onDelete: "cascade" }),
    challengeId: uuid("challenge_id").references(() => challenge.id, { onDelete: "cascade" }),
    communityId: uuid("community_id").references(() => community.id, { onDelete: "cascade" }),
    message: text("message").notNull().default(""),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notification_user_idx").on(t.userId, t.createdAt)],
);

export const reportTarget = pgEnum("report_target", ["post", "comment", "user", "community", "collab"]);
export const reportReason = pgEnum("report_reason", [
  "spam",
  "harassment",
  "hate",
  "nudity",
  "violence",
  "copyright",
  "fraud",
  "impersonation",
  "other",
]);

export const report = pgTable(
  "report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: text("reporter_id").references(() => user.id, { onDelete: "set null" }),
    targetType: reportTarget("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: reportReason("reason").notNull(),
    details: text("details").notNull().default(""),
    status: text("status", { enum: ["open", "resolved", "dismissed"] }).notNull().default("open"),
    resolvedById: text("resolved_by_id").references(() => user.id, { onDelete: "set null" }),
    resolution: text("resolution"),
    createdAt: createdAt(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("report_status_idx").on(t.status, t.createdAt)],
);

export const moderationLog = pgTable("moderation_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  moderatorId: text("moderator_id").references(() => user.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: reportTarget("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reportId: uuid("report_id").references(() => report.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const block = pgTable(
  "block",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index("block_blocked_idx").on(t.blockedId)],
);

export const mute = pgTable(
  "mute",
  {
    muterId: text("muter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mutedId: text("muted_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.muterId, t.mutedId] })],
);

/** Uso de IA: apenas contagens e custo estimado, nunca o conteúdo. */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    feature: text("feature").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
    status: text("status", { enum: ["ok", "error"] }).notNull().default("ok"),
    createdAt: createdAt(),
  },
  (t) => [index("ai_usage_user_idx").on(t.userId, t.createdAt), index("ai_usage_created_idx").on(t.createdAt)],
);

/** Marcos de ativação (primeiro post, primeiro follow...) para métricas de produto. */
export const activationEvent = pgTable(
  "activation_event",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    event: text("event", {
      enum: [
        "signup_completed",
        "onboarding_completed",
        "first_post",
        "first_follow",
        "first_tutorial_saved",
        "first_challenge_submission",
        "first_community_join",
        "first_collab_started",
      ],
    }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.event] })],
);

/* ------------------------------------------------------------------ */
/* Collab — oportunidades de colaboração                               */
/* ------------------------------------------------------------------ */

export const collabListing = pgTable(
  "collab_listing",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
    projectType: text("project_type", { enum: ["ensaio", "video", "edicao", "design", "evento", "comercial", "pessoal", "outro"] }).notNull(),
    compensation: text("compensation"),
    isVolunteer: boolean("is_volunteer").notNull().default(false),
    /** Cidade/região apenas — nunca endereço. */
    location: text("location"),
    mode: text("mode", { enum: ["remoto", "presencial", "hibrido"] }).notNull(),
    deadline: timestamp("deadline", { withTimezone: true }),
    /** Pública: aparece na listagem. Privada: só por link com código. */
    access: text("access", { enum: ["public", "private"] }).notNull().default("public"),
    accessCode: text("access_code").notNull(),
    /** Contato revelado apenas a quem tiver a candidatura aceita. */
    contact: text("contact").notNull(),
    status: text("status", { enum: ["open", "closed", "removed"] }).notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("collab_listing_status_idx").on(t.status, t.access, t.createdAt), index("collab_listing_author_idx").on(t.authorId)],
);

export const collabApplication = pgTable(
  "collab_application",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => collabListing.id, { onDelete: "cascade" }),
    applicantId: text("applicant_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    portfolioUrl: text("portfolio_url"),
    status: text("status", { enum: ["pending", "accepted", "declined"] }).notNull().default("pending"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("collab_application_unique").on(t.listingId, t.applicantId), index("collab_application_applicant_idx").on(t.applicantId)],
);

/* ------------------------------------------------------------------ */
/* Mensagens                                                           */
/* ------------------------------------------------------------------ */

export const conversation = pgTable("conversation", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  isGroup: boolean("is_group").notNull().default(false),
  createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
});

export const conversationMember = pgTable(
  "conversation_member",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
    joinedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] }), index("conversation_member_user_idx").on(t.userId)],
);

export const message = pgTable(
  "message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    senderId: text("sender_id").references(() => user.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    sharedPostId: uuid("shared_post_id").references(() => post.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("message_conversation_idx").on(t.conversationId, t.createdAt)],
);
