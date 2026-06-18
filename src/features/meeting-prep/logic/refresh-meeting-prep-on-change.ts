import { collectMeetingPrepContext } from "@/features/meeting-prep/logic/collect-meeting-prep-context";
import { generateMeetingPrepBrief } from "@/features/meeting-prep/logic/generate-meeting-prep-brief";
import type { RefreshMeetingPrepOnChangeInput } from "@/features/meeting-prep/types/meeting-prep";

export async function refreshMeetingPrepOnChange(
  input: RefreshMeetingPrepOnChangeInput,
) {
  const context = await collectMeetingPrepContext({
    accountId: input.accountId,
    meeting: input.meeting,
  });
  const brief = await generateMeetingPrepBrief({
    accountId: input.accountId,
    meeting: input.meeting,
    context,
  });

  return {
    context,
    brief,
  };
}
