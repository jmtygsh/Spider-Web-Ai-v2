import { getPrimaryHeaders, hasAttachments } from "@/features/projection-sync/logic/gmail-projection-helpers";
import { upsertProjectionEntity } from "@/features/projection-sync/logic/upsert-projection-entity";
import type {
  GmailMessageResource,
  MessageProjection,
} from "@/features/projection-sync/types/projection";

export class MessageProjectionSyncError extends Error {
  constructor(message = "Message projection requires a Gmail message id.") {
    super(message);
    this.name = "MessageProjectionSyncError";
  }
}

export async function syncMessageProjection(input: {
  accountId: string;
  message: GmailMessageResource;
}): Promise<MessageProjection> {
  const externalMessageId = input.message.id?.trim();
  if (!externalMessageId) {
    throw new MessageProjectionSyncError();
  }

  const headers = getPrimaryHeaders(input.message.payload);
  const from =
    headers.from.email || headers.from.name ? headers.from : null;
  const sender =
    headers.sender.email || headers.sender.name ? headers.sender : null;
  const version =
    input.message.historyId?.trim() ||
    input.message.internalDate?.trim() ||
    externalMessageId;

  const projection: MessageProjection = {
    id: `${input.accountId}:message:${externalMessageId}`,
    accountId: input.accountId,
    entityType: "message_projection",
    externalMessageId,
    externalThreadId: input.message.threadId?.trim() || null,
    provider: "gmail",
    version,
    historyId: input.message.historyId?.trim() || null,
    internalDate: input.message.internalDate?.trim() || null,
    snippet: input.message.snippet?.trim() || null,
    subject: headers.subject,
    from,
    sender,
    to: headers.to,
    cc: headers.cc,
    bcc: headers.bcc,
    replyTo: headers.replyTo,
    labelIds: input.message.labelIds?.filter(Boolean) ?? [],
    hasAttachments: hasAttachments(input.message.payload),
    isUnread: (input.message.labelIds ?? []).includes("UNREAD"),
    raw: input.message as Record<string, unknown>,
  };

  await upsertProjectionEntity({
    accountId: input.accountId,
    entityId: externalMessageId,
    entityType: projection.entityType,
    version: projection.version,
    data: projection,
  });

  return projection;
}
