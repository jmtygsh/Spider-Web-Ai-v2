import { upsertProjectionEntity } from "@/features/projection-sync/logic/upsert-projection-entity";
import type {
  CalendarEventResource,
  MeetingProjection,
  ProjectionParticipant,
} from "@/features/projection-sync/types/projection";

export class MeetingProjectionSyncError extends Error {
  constructor(message = "Meeting projection requires a Calendar event id.") {
    super(message);
    this.name = "MeetingProjectionSyncError";
  }
}

function normalizePerson(
  person:
    | {
        email?: string | null;
        displayName?: string | null;
      }
    | null
    | undefined,
): ProjectionParticipant | null {
  if (!person) return null;

  const normalized = {
    email: person.email?.trim() ?? null,
    name: person.displayName?.trim() ?? null,
  };

  return normalized.email || normalized.name ? normalized : null;
}

function normalizeEventDateTime(
  value:
    | {
        date?: string | null;
        dateTime?: string | null;
      }
    | null
    | undefined,
) {
  return value?.dateTime?.trim() ?? value?.date?.trim() ?? null;
}

export async function syncMeetingProjection(input: {
  accountId: string;
  meeting: CalendarEventResource;
  calendarId?: string | null;
}): Promise<MeetingProjection> {
  const externalMeetingId = input.meeting.id?.trim();
  if (!externalMeetingId) {
    throw new MeetingProjectionSyncError();
  }

  const attendees =
    input.meeting.attendees?.map((attendee) => ({
      email: attendee.email?.trim() ?? null,
      name: attendee.displayName?.trim() ?? null,
      responseStatus: attendee.responseStatus?.trim() ?? null,
      optional: attendee.optional ?? false,
      self: attendee.self ?? false,
      organizer: attendee.organizer ?? false,
    })) ?? [];
  const version =
    input.meeting.updated?.trim() ??
    `${input.meeting.sequence ?? 0}:${externalMeetingId}`;

  const projection: MeetingProjection = {
    id: `${input.accountId}:meeting:${externalMeetingId}`,
    accountId: input.accountId,
    entityType: "meeting_projection",
    externalMeetingId,
    provider: "googlecalendar",
    version,
    calendarId: input.calendarId?.trim() ?? null,
    iCalUID: input.meeting.iCalUID?.trim() ?? null,
    status: input.meeting.status?.trim() ?? null,
    title: input.meeting.summary?.trim() ?? null,
    description: input.meeting.description?.trim() ?? null,
    location: input.meeting.location?.trim() ?? null,
    htmlLink: input.meeting.htmlLink?.trim() ?? null,
    hangoutLink: input.meeting.hangoutLink?.trim() ?? null,
    eventType: input.meeting.eventType?.trim() ?? null,
    organizer: normalizePerson(input.meeting.organizer),
    creator: normalizePerson(input.meeting.creator),
    attendees,
    attendeeCount: attendees.length,
    startAt: normalizeEventDateTime(input.meeting.start),
    endAt: normalizeEventDateTime(input.meeting.end),
    timeZone:
      input.meeting.start?.timeZone?.trim() ??
      input.meeting.end?.timeZone?.trim() ??
      null,
    isCancelled: input.meeting.status === "cancelled",
    raw: input.meeting,
  };

  await upsertProjectionEntity({
    accountId: input.accountId,
    entityId: externalMeetingId,
    entityType: projection.entityType,
    version: projection.version,
    data: projection,
  });

  return projection;
}
