import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { env } from "@/env";
import type {
  AgentReasoningResult,
  InvokeReasoningModelInput,
} from "@/features/agent-runtime/types/agent-runtime";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const agentReasoningResultSchema = z.object({
  summary: z.string(),
  classification: z.string(),
  confidence: z.number().min(0).max(1),
  nextActions: z.array(z.string()).max(5),
  draftText: z.string().nullable(),
  structuredData: z.record(z.string(), z.unknown()),
});

function buildContextPrompt(input: InvokeReasoningModelInput) {
  return JSON.stringify(
    {
      purpose: input.context.purpose,
      relatedThread: input.context.relatedThread
        ? {
            id: input.context.relatedThread.externalThreadId,
            subject: input.context.relatedThread.subject,
            snippet: input.context.relatedThread.snippet,
            participants: input.context.relatedThread.participants,
            messageCount: input.context.relatedThread.messageCount,
            lastMessageAt: input.context.relatedThread.lastMessageAt,
          }
        : null,
      relatedMeeting: input.context.relatedMeeting
        ? {
            id: input.context.relatedMeeting.externalMeetingId,
            title: input.context.relatedMeeting.title,
            description: input.context.relatedMeeting.description,
            startAt: input.context.relatedMeeting.startAt,
            attendeeCount: input.context.relatedMeeting.attendeeCount,
            attendees: input.context.relatedMeeting.attendees.slice(0, 8),
          }
        : null,
      relatedPerson: input.context.relatedPerson
        ? {
            email: input.context.relatedPerson.personEmail,
            name: input.context.relatedPerson.personName,
            lastMeeting: input.context.relatedPerson.lastMeeting?.title ?? null,
            openRequests: input.context.relatedPerson.openRequests.slice(0, 5),
            pendingTasks: input.context.relatedPerson.pendingTasks.slice(0, 5),
            activeTopics: input.context.relatedPerson.activeTopics.slice(0, 5),
          }
        : null,
      prepBriefs: input.context.prepBriefs.map((brief) => ({
        meetingId: brief.meetingId,
        summary: brief.summary,
        unansweredCount: brief.unansweredCount,
        risks: brief.risks.slice(0, 4),
        nextActions: brief.nextActions.slice(0, 4),
      })),
      commitments: input.context.commitments.map((entry) => ({
        threadId: entry.threadId,
        commitments: entry.commitments.slice(0, 5).map((commitment) => ({
          title: commitment.title,
          kind: commitment.kind,
          confidence: commitment.confidence,
          ownerEmail: commitment.ownerEmail,
        })),
      })),
      suggestions: input.context.suggestions.slice(0, 6),
      topTimelineItems: input.context.topTimelineItems.slice(0, 6).map((item) => ({
        kind: item.kind,
        title: item.title,
        summary: item.summary,
        rankScore: item.rankScore,
      })),
    },
    null,
    2,
  );
}

export async function invokeReasoningModel(
  input: InvokeReasoningModelInput,
): Promise<AgentReasoningResult> {
  const response = await openai.responses.parse({
    model: input.run.model ?? "gpt-4o-2024-08-06",
    input: [
      {
        role: "system",
        content:
          "You are a workflow intelligence reasoning module. Return only structured results. Prefer short, actionable outputs grounded strictly in provided context.",
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Run purpose: ${input.run.purpose}\nInstruction: ${input.instruction}`,
          },
          {
            type: "input_text",
            text: `Curated context:\n${buildContextPrompt(input)}`,
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(agentReasoningResultSchema, "agent_reasoning_result"),
    },
  });

  return response.output_parsed;
}
