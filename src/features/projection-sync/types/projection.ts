export type ProjectionEntityType =
  | "thread_projection"
  | "message_projection"
  | "meeting_projection";

export type ProjectionParticipant = {
  email: string | null;
  name: string | null;
};

export type ThreadProjection = {
  id: string;
  accountId: string;
  entityType: "thread_projection";
  externalThreadId: string;
  provider: "gmail";
  version: string;
  subject: string | null;
  snippet: string | null;
  historyId: string | null;
  labelIds: string[];
  messageCount: number;
  messageIds: string[];
  participantEmails: string[];
  participants: ProjectionParticipant[];
  lastMessageAt: string | null;
  raw: Record<string, unknown>;
};

export type MessageProjection = {
  id: string;
  accountId: string;
  entityType: "message_projection";
  externalMessageId: string;
  externalThreadId: string | null;
  provider: "gmail";
  version: string;
  historyId: string | null;
  internalDate: string | null;
  snippet: string | null;
  subject: string | null;
  from: ProjectionParticipant | null;
  sender: ProjectionParticipant | null;
  to: ProjectionParticipant[];
  cc: ProjectionParticipant[];
  bcc: ProjectionParticipant[];
  replyTo: ProjectionParticipant[];
  labelIds: string[];
  hasAttachments: boolean;
  isUnread: boolean;
  raw: Record<string, unknown>;
};

export type MeetingProjection = {
  id: string;
  accountId: string;
  entityType: "meeting_projection";
  externalMeetingId: string;
  provider: "googlecalendar";
  version: string;
  calendarId: string | null;
  iCalUID: string | null;
  status: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  htmlLink: string | null;
  hangoutLink: string | null;
  eventType: string | null;
  organizer: ProjectionParticipant | null;
  creator: ProjectionParticipant | null;
  attendees: Array<
    ProjectionParticipant & {
      responseStatus: string | null;
      optional: boolean;
      self: boolean;
      organizer: boolean;
    }
  >;
  attendeeCount: number;
  startAt: string | null;
  endAt: string | null;
  timeZone: string | null;
  isCancelled: boolean;
  raw: Record<string, unknown>;
};

export type GmailHeader = {
  name?: string | null;
  value?: string | null;
};

export type GmailMessagePart = {
  filename?: string | null;
  headers?: GmailHeader[] | null;
  mimeType?: string | null;
  parts?: GmailMessagePart[] | null;
};

export type GmailMessageResource = {
  id?: string | null;
  threadId?: string | null;
  labelIds?: string[] | null;
  snippet?: string | null;
  historyId?: string | null;
  internalDate?: string | null;
  payload?: GmailMessagePart | null;
};

export type GmailThreadResource = {
  id?: string | null;
  historyId?: string | null;
  snippet?: string | null;
  messages?: GmailMessageResource[] | null;
};

export type CalendarEventAttendeeResource = {
  email?: string | null;
  displayName?: string | null;
  responseStatus?: string | null;
  optional?: boolean | null;
  self?: boolean | null;
  organizer?: boolean | null;
};

export type CalendarEventPersonResource = {
  email?: string | null;
  displayName?: string | null;
};

export type CalendarEventDateTimeResource = {
  date?: string | null;
  dateTime?: string | null;
  timeZone?: string | null;
};

export type CalendarEventResource = {
  id?: string | null;
  status?: string | null;
  htmlLink?: string | null;
  created?: string | null;
  updated?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  organizer?: CalendarEventPersonResource | null;
  creator?: CalendarEventPersonResource | null;
  start?: CalendarEventDateTimeResource | null;
  end?: CalendarEventDateTimeResource | null;
  iCalUID?: string | null;
  sequence?: number | null;
  attendees?: CalendarEventAttendeeResource[] | null;
  hangoutLink?: string | null;
  eventType?: string | null;
};
