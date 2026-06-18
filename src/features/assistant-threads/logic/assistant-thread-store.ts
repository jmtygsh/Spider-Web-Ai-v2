import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { ThreadMessage } from "@assistant-ui/react";

import type {
  AssistantThreadListItem,
  AssistantThreadMessageRecord,
} from "@/features/assistant-threads/types/thread";
import { db } from "@/server/db";
import {
  assistantMessages,
  assistantThreads,
} from "@/server/db/schema";

const DEFAULT_THREAD_TITLE = "New command center thread";

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function mapAssistantThread(
  row: typeof assistantThreads.$inferSelect,
): AssistantThreadListItem {
  return {
    id: row.id,
    title: row.title,
    status: row.archivedAt ? "archived" : "regular",
    archived: Boolean(row.archivedAt),
    externalId: row.externalId ?? null,
    lastMessageAt: toIsoString(row.lastMessageAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapAssistantMessage(
  row: typeof assistantMessages.$inferSelect,
): AssistantThreadMessageRecord {
  return {
    id: row.id,
    parentId: row.parentId ?? null,
    createdAt: row.createdAt.toISOString(),
    message: row.message as ThreadMessage,
  };
}

function extractMessageText(message: ThreadMessage): string {
  const raw = message as unknown as {
    content?: Array<{ type?: string; text?: string }>;
    parts?: Array<{ type?: string; text?: string }>;
  };
  const textParts = Array.isArray(raw.parts)
    ? raw.parts
    : Array.isArray(raw.content)
      ? raw.content
      : [];

  return textParts
    .flatMap((part) => {
      if (part.type !== "text") return [];
      return typeof part.text === "string" ? [part.text.trim()] : [];
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function buildThreadTitleFromText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return DEFAULT_THREAD_TITLE;
  }

  return normalized.length <= 72
    ? normalized
    : `${normalized.slice(0, 69).trimEnd()}...`;
}

async function loadAssistantThreadRow(input: {
  workspaceId: string;
  userId: string;
  threadId: string;
}) {
  return await db.query.assistantThreads.findFirst({
    where: and(
      eq(assistantThreads.id, input.threadId),
      eq(assistantThreads.workspaceId, input.workspaceId),
      eq(assistantThreads.userId, input.userId),
    ),
  });
}

export async function listAssistantThreads(input: {
  workspaceId: string;
  userId: string;
}): Promise<AssistantThreadListItem[]> {
  const rows = await db.query.assistantThreads.findMany({
    where: and(
      eq(assistantThreads.workspaceId, input.workspaceId),
      eq(assistantThreads.userId, input.userId),
    ),
    orderBy: [desc(assistantThreads.updatedAt)],
  });

  return rows.map(mapAssistantThread);
}

export async function createAssistantThread(input: {
  workspaceId: string;
  userId: string;
  externalId?: string | null;
}): Promise<AssistantThreadListItem> {
  const now = new Date();
  const [row] = await db
    .insert(assistantThreads)
    .values({
      id: randomUUID(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      title: DEFAULT_THREAD_TITLE,
      status: "regular",
      externalId: input.externalId?.trim() ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new Error("Assistant thread insert did not return a row.");
  }

  return mapAssistantThread(row);
}

export async function getAssistantThread(input: {
  workspaceId: string;
  userId: string;
  threadId: string;
}): Promise<AssistantThreadListItem | null> {
  const row = await loadAssistantThreadRow(input);
  return row ? mapAssistantThread(row) : null;
}

export async function renameAssistantThread(input: {
  workspaceId: string;
  userId: string;
  threadId: string;
  title: string;
}): Promise<AssistantThreadListItem | null> {
  const nextTitle = input.title.trim();
  if (!nextTitle) {
    return null;
  }

  const [row] = await db
    .update(assistantThreads)
    .set({
      title: nextTitle,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(assistantThreads.id, input.threadId),
        eq(assistantThreads.workspaceId, input.workspaceId),
        eq(assistantThreads.userId, input.userId),
      ),
    )
    .returning();

  return row ? mapAssistantThread(row) : null;
}

export async function archiveAssistantThread(input: {
  workspaceId: string;
  userId: string;
  threadId: string;
}): Promise<AssistantThreadListItem | null> {
  const now = new Date();
  const [row] = await db
    .update(assistantThreads)
    .set({
      status: "archived",
      archivedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(assistantThreads.id, input.threadId),
        eq(assistantThreads.workspaceId, input.workspaceId),
        eq(assistantThreads.userId, input.userId),
      ),
    )
    .returning();

  return row ? mapAssistantThread(row) : null;
}

export async function unarchiveAssistantThread(input: {
  workspaceId: string;
  userId: string;
  threadId: string;
}): Promise<AssistantThreadListItem | null> {
  const [row] = await db
    .update(assistantThreads)
    .set({
      status: "regular",
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(assistantThreads.id, input.threadId),
        eq(assistantThreads.workspaceId, input.workspaceId),
        eq(assistantThreads.userId, input.userId),
      ),
    )
    .returning();

  return row ? mapAssistantThread(row) : null;
}

export async function deleteAssistantThread(input: {
  workspaceId: string;
  userId: string;
  threadId: string;
}): Promise<boolean> {
  const rows = await db
    .delete(assistantThreads)
    .where(
      and(
        eq(assistantThreads.id, input.threadId),
        eq(assistantThreads.workspaceId, input.workspaceId),
        eq(assistantThreads.userId, input.userId),
      ),
    )
    .returning({ id: assistantThreads.id });

  return rows.length > 0;
}

export async function loadAssistantMessages(input: {
  workspaceId: string;
  userId: string;
  threadId: string;
}): Promise<AssistantThreadMessageRecord[] | null> {
  const thread = await loadAssistantThreadRow(input);
  if (!thread) {
    return null;
  }

  const rows = await db.query.assistantMessages.findMany({
    where: eq(assistantMessages.threadId, input.threadId),
    orderBy: [assistantMessages.createdAt],
  });

  return rows.map(mapAssistantMessage);
}

export async function appendAssistantMessage(input: {
  workspaceId: string;
  userId: string;
  threadId: string;
  parentId?: string | null;
  message: ThreadMessage;
}): Promise<AssistantThreadMessageRecord | null> {
  const thread = await loadAssistantThreadRow(input);
  if (!thread) {
    return null;
  }

  const messageId =
    typeof input.message.id === "string" && input.message.id.trim()
      ? input.message.id.trim()
      : randomUUID();
  const contentText = extractMessageText(input.message);
  const now = new Date();
  const nextTitle =
    input.message.role === "user" &&
    (thread.title === DEFAULT_THREAD_TITLE || !thread.title.trim()) &&
    contentText
      ? buildThreadTitleFromText(contentText)
      : thread.title;

  const storedMessage: ThreadMessage =
    messageId === input.message.id
      ? input.message
      : {
          ...input.message,
          id: messageId,
        };

  const [row] = await db
    .insert(assistantMessages)
    .values({
      id: messageId,
      threadId: input.threadId,
      parentId: input.parentId?.trim() ?? null,
      role: input.message.role,
      contentText,
      message: storedMessage,
      createdAt: now,
    })
    .returning();

  if (!row) {
    throw new Error("Assistant message insert did not return a row.");
  }

  await db
    .update(assistantThreads)
    .set({
      title: nextTitle,
      status: "regular",
      archivedAt: null,
      lastMessageAt: now,
      updatedAt: now,
    })
    .where(eq(assistantThreads.id, input.threadId));

  return mapAssistantMessage(row);
}
