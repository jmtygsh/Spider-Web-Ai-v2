import type { ConnectPluginId } from "@/constants/plugins";
import type { AgentRun } from "@/features/agent-runtime";
import type { ExecutionLogEntry } from "@/features/execution";
import type { InboxTriageView } from "@/features/inbox-triage";
import type { MeetingPrepBrief } from "@/features/meeting-prep";
import type { MeetingProjection, ThreadProjection } from "@/features/projection-sync";
import type {
  RelationshipProfile,
  RelationshipSummary,
} from "@/features/relationship-intelligence";
import type {
  MeetingSuggestion,
  NextBestActionSuggestion,
  ReplySuggestion,
} from "@/features/suggestions";
import type { TimelineItem } from "@/features/timeline";

export type CommandCenterConnection = {
  pluginId: ConnectPluginId;
  connected: boolean;
  accountId: string | null;
};

export type CommandCenterStats = {
  connectedIntegrations: number;
  timelineItems: number;
  prepBriefs: number;
  relationshipProfiles: number;
  executionLogs: number;
  threads: number;
  meetings: number;
  meetingSuggestions: number;
  replySuggestions: number;
  inboxTriageItems: number;
  pendingAiScan: number;
  agentRuns: number;
};

export type CommandCenterSummary = {
  generatedAt: string;
  connections: CommandCenterConnection[];
  nextBestAction: NextBestActionSuggestion | null;
  timelineItems: TimelineItem[];
  prepBriefs: MeetingPrepBrief[];
  relationshipProfiles: RelationshipProfile[];
  relationshipSummaries: RelationshipSummary[];
  meetingSuggestions: MeetingSuggestion[];
  replySuggestions: ReplySuggestion[];
  inboxTriage: InboxTriageView;
  agentRuns: AgentRun[];
  executionLogs: ExecutionLogEntry[];
  threads: ThreadProjection[];
  meetings: MeetingProjection[];
  stats: CommandCenterStats;
};
