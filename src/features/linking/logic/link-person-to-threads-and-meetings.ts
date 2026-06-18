import { upsertLinkEntity } from "@/features/linking/logic/upsert-link-entity";
import type {
  LinkPersonToThreadsAndMeetingsInput,
  LinkPersonToThreadsAndMeetingsResult,
  PersonAnchor,
  PersonMeetingLink,
  PersonThreadLink,
} from "@/features/linking/types/linking";

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

export async function linkPersonToThreadsAndMeetings(
  input: LinkPersonToThreadsAndMeetingsInput,
): Promise<LinkPersonToThreadsAndMeetingsResult> {
  const personMap = new Map<string, PersonAnchor>();
  const threadLinks: PersonThreadLink[] = [];
  const meetingLinks: PersonMeetingLink[] = [];

  for (const thread of input.threads) {
    for (const participant of thread.participants) {
      const email = normalizeEmail(participant.email);
      if (!email) continue;

      const anchor =
        personMap.get(email) ??
        ({
          id: `${input.accountId}:person:${email}`,
          accountId: input.accountId,
          entityType: "person_anchor",
          email,
          name: participant.name,
          sourceCount: 0,
        } satisfies PersonAnchor);

      anchor.sourceCount += 1;
      if (!anchor.name && participant.name) {
        anchor.name = participant.name;
      }
      personMap.set(email, anchor);

      threadLinks.push({
        id: `${input.accountId}:person-thread:${email}:${thread.externalThreadId}`,
        accountId: input.accountId,
        entityType: "person_thread_link",
        personEmail: email,
        threadId: thread.externalThreadId,
        role: "participant",
        messageCount: thread.messageCount,
        lastMessageAt: thread.lastMessageAt,
      });
    }
  }

  for (const meeting of input.meetings) {
    const directPeople = [
      {
        person: meeting.organizer,
        role: "organizer" as const,
        responseStatus: null,
      },
      {
        person: meeting.creator,
        role: "creator" as const,
        responseStatus: null,
      },
      ...meeting.attendees.map((attendee) => ({
        person: { email: attendee.email, name: attendee.name },
        role: "attendee" as const,
        responseStatus: attendee.responseStatus,
      })),
    ];

    for (const entry of directPeople) {
      const email = normalizeEmail(entry.person?.email);
      if (!email) continue;

      const anchor =
        personMap.get(email) ??
        ({
          id: `${input.accountId}:person:${email}`,
          accountId: input.accountId,
          entityType: "person_anchor",
          email,
          name: entry.person?.name ?? null,
          sourceCount: 0,
        } satisfies PersonAnchor);

      anchor.sourceCount += 1;
      if (!anchor.name && entry.person?.name) {
        anchor.name = entry.person.name;
      }
      personMap.set(email, anchor);

      meetingLinks.push({
        id: `${input.accountId}:person-meeting:${email}:${meeting.externalMeetingId}:${entry.role}`,
        accountId: input.accountId,
        entityType: "person_meeting_link",
        personEmail: email,
        meetingId: meeting.externalMeetingId,
        role: entry.role,
        responseStatus: entry.responseStatus,
        startAt: meeting.startAt,
      });
    }
  }

  const persons = Array.from(personMap.values());

  for (const person of persons) {
    await upsertLinkEntity({
      accountId: input.accountId,
      entityId: person.email,
      entityType: person.entityType,
      version: `${person.sourceCount}`,
      data: person,
    });
  }

  for (const link of threadLinks) {
    await upsertLinkEntity({
      accountId: input.accountId,
      entityId: `${link.personEmail}:${link.threadId}`,
      entityType: link.entityType,
      version: `${link.messageCount}:${link.lastMessageAt ?? "unknown"}`,
      data: link,
    });
  }

  for (const link of meetingLinks) {
    await upsertLinkEntity({
      accountId: input.accountId,
      entityId: `${link.personEmail}:${link.meetingId}:${link.role}`,
      entityType: link.entityType,
      version: `${link.role}:${link.startAt ?? "unknown"}`,
      data: link,
    });
  }

  return {
    persons,
    threadLinks,
    meetingLinks,
  };
}
