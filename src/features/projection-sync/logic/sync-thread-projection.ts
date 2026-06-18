import { getPrimaryHeaders } from "@/features/projection-sync/logic/gmail-projection-helpers";
import { upsertProjectionEntity } from "@/features/projection-sync/logic/upsert-projection-entity";
import type {
  GmailThreadResource,
  ProjectionParticipant,
  ThreadProjection,
} from "@/features/projection-sync/types/projection";

export class ThreadProjectionSyncError extends Error {
  constructor(message = "Thread projection requires a Gmail thread id.") {
    super(message);
    this.name = "ThreadProjectionSyncError";
  }
}

function uniqueParticipants(participants: ProjectionParticipant[]) {
  const seen = new Set<string>();
  const deduped: ProjectionParticipant[] = [];

  for (const participant of participants) {
    const key = `${participant.email ?? ""}:${participant.name ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(participant);
  }

  return deduped;
}

export async function syncThreadProjection(input: {
  accountId: string;
  thread: GmailThreadResource;
}): Promise<ThreadProjection> {
  const externalThreadId = input.thread.id?.trim();
  if (!externalThreadId) {
    throw new ThreadProjectionSyncError();
  }

  const messages = input.thread.messages ?? [];
  const firstMessage = messages[0];
  const lastMessage = messages.at(-1);
  const firstHeaders = getPrimaryHeaders(firstMessage?.payload);

  const participantPool = messages.flatMap((message) => {
    const headers = getPrimaryHeaders(message.payload);
    const participants = [
      headers.from,
      headers.sender,
      ...headers.to,
      ...headers.cc,
      ...headers.replyTo,
    ];

    return participants.filter(
      (participant) =>
        Boolean(participant.email) || Boolean(participant.name),
    );
  });
  const participants = uniqueParticipants(participantPool);
  const version =
    input.thread.historyId?.trim() ??
    lastMessage?.historyId?.trim() ??
    `${messages.length}:${externalThreadId}`;

  const projection: ThreadProjection = {
    id: `${input.accountId}:thread:${externalThreadId}`,
    accountId: input.accountId,
    entityType: "thread_projection",
    externalThreadId,
    provider: "gmail",
    version,
    subject: firstHeaders.subject,
    snippet: input.thread.snippet?.trim() ?? lastMessage?.snippet?.trim() ?? null,
    historyId: input.thread.historyId?.trim() ?? lastMessage?.historyId?.trim() ?? null,
    labelIds: Array.from(
      new Set(messages.flatMap((message) => message.labelIds ?? [])),
    ),
    messageCount: messages.length,
    messageIds: messages
      .map((message) => message.id?.trim())
      .filter((value): value is string => !!value),
    participantEmails: participants
      .map((participant) => participant.email)
      .filter((value): value is string => !!value),
    participants,
    lastMessageAt: lastMessage?.internalDate?.trim() ?? null,
    raw: input.thread,
  };

  await upsertProjectionEntity({
    accountId: input.accountId,
    entityId: externalThreadId,
    entityType: projection.entityType,
    version: projection.version,
    data: projection,
  });

  return projection;
}
