import type { MessageProjection, MeetingProjection } from "@/features/projection-sync";
import { loadRelationshipProfileBundle } from "@/features/relationship-intelligence/logic/relationship-intelligence-store";
import { upsertRelationshipEntity } from "@/features/relationship-intelligence/logic/upsert-relationship-entity";
import type {
  BuildRelationshipProfileInput,
  RelationshipProfile,
} from "@/features/relationship-intelligence/types/relationship-intelligence";

function parseMillis(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function computeAverageResponseLatencyHours(
  personEmail: string,
  messages: MessageProjection[],
) {
  const byThread = new Map<string, MessageProjection[]>();

  for (const message of messages) {
    if (!message.externalThreadId) continue;
    const list = byThread.get(message.externalThreadId) ?? [];
    list.push(message);
    byThread.set(message.externalThreadId, list);
  }

  const latencyHours: number[] = [];

  for (const threadMessages of byThread.values()) {
    const sorted = [...threadMessages].sort(
      (left, right) =>
        Number(left.internalDate ?? 0) - Number(right.internalDate ?? 0),
    );

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (!previous || !current) continue;
      const previousSender = previous.from?.email?.toLowerCase() ?? null;
      const currentSender = current.from?.email?.toLowerCase() ?? null;

      if (
        previousSender &&
        currentSender === personEmail &&
        previousSender !== personEmail
      ) {
        const previousAt = Number(previous.internalDate ?? 0);
        const currentAt = Number(current.internalDate ?? 0);
        if (currentAt > previousAt) {
          latencyHours.push((currentAt - previousAt) / (1000 * 60 * 60));
        }
      }
    }
  }

  if (latencyHours.length === 0) return null;

  const average =
    latencyHours.reduce((sum, value) => sum + value, 0) / latencyHours.length;
  return Number(average.toFixed(2));
}

function pickLastMeeting(meetings: MeetingProjection[]) {
  return (
    [...meetings].sort((left, right) => {
      const leftAt = parseMillis(left.startAt) ?? 0;
      const rightAt = parseMillis(right.startAt) ?? 0;
      return rightAt - leftAt;
    })[0] ?? null
  );
}

export async function buildRelationshipProfile(
  input: BuildRelationshipProfileInput,
): Promise<RelationshipProfile> {
  const personEmail = input.personEmail.trim().toLowerCase();
  const bundle = await loadRelationshipProfileBundle({
    accountId: input.accountId,
    personEmail,
  });

  const openRequests = bundle.commitments
    .flatMap((entry) => entry.commitments)
    .filter(
      (commitment) =>
        commitment.kind === "pending_ask" &&
        commitment.status === "open" &&
        commitment.participantEmails
          .map((email) => email.toLowerCase())
          .includes(personEmail),
    )
    .map((commitment) => commitment.title);

  const pendingTasks = bundle.commitments
    .flatMap((entry) => entry.commitments)
    .filter(
      (commitment) =>
        commitment.status === "open" &&
        (commitment.ownerEmail?.toLowerCase() === personEmail ||
          commitment.participantEmails
            .map((email) => email.toLowerCase())
            .includes(personEmail)),
    )
    .map((commitment) => commitment.title);

  const topicCounts = new Map<string, number>();
  for (const entry of bundle.topics) {
    for (const topic of entry.topics) {
      topicCounts.set(topic.label, (topicCounts.get(topic.label) ?? 0) + 1);
    }
  }

  const activeTopics = [...topicCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([label]) => label);

  const emailCount = bundle.threadLinks.reduce(
    (sum, link) => sum + link.messageCount,
    0,
  );
  const averageResponseLatencyHours = computeAverageResponseLatencyHours(
    personEmail,
    bundle.messages,
  );

  const profile: RelationshipProfile = {
    id: `${input.accountId}:relationship-profile:${personEmail}`,
    accountId: input.accountId,
    entityType: "relationship_profile",
    personEmail,
    personName: bundle.anchor?.name ?? null,
    lastMeeting: pickLastMeeting(bundle.meetings),
    emailCount,
    averageResponseLatencyHours,
    openRequests: Array.from(new Set(openRequests)).slice(0, 10),
    pendingTasks: Array.from(new Set(pendingTasks)).slice(0, 10),
    activeTopics,
    threadCount: bundle.threadLinks.length,
    meetingCount: bundle.meetingLinks.length,
    anchor: bundle.anchor,
    threadLinks: bundle.threadLinks,
    meetingLinks: bundle.meetingLinks,
    version: [
      bundle.anchor?.sourceCount ?? 0,
      bundle.threadLinks.length,
      bundle.meetingLinks.length,
      bundle.messages.length,
      bundle.commitments.length,
      bundle.topics.length,
    ].join(":"),
  };

  await upsertRelationshipEntity({
    accountId: input.accountId,
    entityId: personEmail,
    entityType: profile.entityType,
    version: profile.version,
    data: profile,
  });

  return profile;
}
