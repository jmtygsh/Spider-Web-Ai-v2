import { loadAllMeetings, loadAllThreads } from "@/features/command-bar/logic/command-bar-store";
import type {
  ResolveCommandEntitiesInput,
  ResolvedCommandEntities,
  ResolvedCommandMeeting,
  ResolvedCommandPerson,
  ResolvedCommandThread,
} from "@/features/command-bar/types/command-bar";
import { tokenize } from "@/features/linking/logic/linking-helpers";

function scoreTextMatch(haystackValues: Array<string | null | undefined>, query: string) {
  if (!query) return 0;

  const haystack = haystackValues
    .filter((value): value is string => !!value)
    .join(" ")
    .toLowerCase();
  if (!haystack) return 0;
  if (haystack.includes(query)) return 1;

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;
  const matches = queryTokens.filter((token) => haystack.includes(token)).length;
  return matches / queryTokens.length;
}

function dedupePersons(persons: ResolvedCommandPerson[]) {
  const map = new Map<string, ResolvedCommandPerson>();

  for (const person of persons) {
    const existing = map.get(person.email);
    if (!existing || existing.confidence < person.confidence) {
      map.set(person.email, person);
    }
  }

  return Array.from(map.values()).sort((left, right) => right.confidence - left.confidence);
}

export async function resolveCommandEntities(
  input: ResolveCommandEntitiesInput,
): Promise<ResolvedCommandEntities> {
  const meetings = await loadAllMeetings(input.accountId);
  const threads = await loadAllThreads(input.accountId);
  const query = input.parsed.args.queryText?.toLowerCase() ?? "";

  const resolvedMeetings: ResolvedCommandMeeting[] = meetings
    .map((meeting) => {
      const score = scoreTextMatch(
        [
          meeting.title,
          meeting.description,
          meeting.location,
          meeting.organizer?.name,
          meeting.organizer?.email,
          meeting.creator?.name,
          meeting.creator?.email,
          ...meeting.attendees.flatMap((attendee) => [attendee.name, attendee.email]),
        ],
        query,
      );

      const reasons = [
        ...(score >= 1 ? ["exact meeting text match"] : []),
        ...(score >= 0.5 && score < 1 ? ["partial meeting text match"] : []),
      ];

      return {
        meeting,
        confidence: Number(score.toFixed(4)),
        reasons,
      };
    })
    .filter((entry) => entry.confidence >= 0.35)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5);

  const resolvedThreads: ResolvedCommandThread[] = threads
    .map((thread) => {
      const score = scoreTextMatch(
        [
          thread.subject,
          thread.snippet,
          ...thread.participants.flatMap((participant) => [
            participant.name,
            participant.email,
          ]),
        ],
        query,
      );

      const reasons = [
        ...(score >= 1 ? ["exact thread text match"] : []),
        ...(score >= 0.5 && score < 1 ? ["partial thread text match"] : []),
      ];

      return {
        thread,
        confidence: Number(score.toFixed(4)),
        reasons,
      };
    })
    .filter((entry) => entry.confidence >= 0.35)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5);

  const peoplePool: ResolvedCommandPerson[] = [
    ...meetings.flatMap((meeting) => [
      ...(meeting.organizer?.email
        ? [
            {
              email: meeting.organizer.email,
              name: meeting.organizer.name,
              confidence: input.parsed.args.participantHints.includes(
                meeting.organizer.email.toLowerCase(),
              )
                ? 1
                : scoreTextMatch(
                    [meeting.organizer.email, meeting.organizer.name],
                    query,
                  ),
            },
          ]
        : []),
      ...(meeting.creator?.email
        ? [
            {
              email: meeting.creator.email,
              name: meeting.creator.name,
              confidence: input.parsed.args.participantHints.includes(
                meeting.creator.email.toLowerCase(),
              )
                ? 1
                : scoreTextMatch([meeting.creator.email, meeting.creator.name], query),
            },
          ]
        : []),
      ...meeting.attendees
        .filter((attendee) => !!attendee.email)
        .map((attendee) => ({
          email: attendee.email!,
          name: attendee.name,
          confidence: input.parsed.args.participantHints.includes(
            attendee.email!.toLowerCase(),
          )
            ? 1
            : scoreTextMatch([attendee.email, attendee.name], query),
        })),
    ]),
    ...threads.flatMap((thread) =>
      thread.participants
        .filter((participant) => !!participant.email)
        .map((participant) => ({
          email: participant.email!,
          name: participant.name,
          confidence: input.parsed.args.participantHints.includes(
            participant.email!.toLowerCase(),
          )
            ? 1
            : scoreTextMatch([participant.email, participant.name], query),
        })),
    ),
  ].filter((person) => person.confidence >= 0.4);

  return {
    persons: dedupePersons(peoplePool).slice(0, 8),
    meetings: resolvedMeetings,
    threads: resolvedThreads,
    timeHints: input.parsed.args.timeHints,
  };
}
