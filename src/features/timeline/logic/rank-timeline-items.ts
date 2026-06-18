import type {
  RankTimelineItemsInput,
  TimelineItem,
} from "@/features/timeline/types/timeline";

function parseMillis(value: string | null) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function withRankScore(item: TimelineItem): TimelineItem {
  const eventAt = parseMillis(item.eventAt);
  const now = Date.now();
  let proximityScore = 0;

  if (eventAt !== null) {
    const deltaHours = Math.abs(eventAt - now) / (1000 * 60 * 60);
    if (deltaHours <= 2) proximityScore = 1;
    else if (deltaHours <= 24) proximityScore = 0.7;
    else if (deltaHours <= 72) proximityScore = 0.35;
  }

  return {
    ...item,
    rankScore: Number(
      (
        item.urgencyScore * 0.35 +
        item.importanceScore * 0.3 +
        item.relevanceScore * 0.2 +
        proximityScore * 0.15
      ).toFixed(4),
    ),
  };
}

export function rankTimelineItems(
  input: RankTimelineItemsInput,
): TimelineItem[] {
  return input.items
    .map(withRankScore)
    .sort((left, right) => {
      if (right.rankScore !== left.rankScore) {
        return right.rankScore - left.rankScore;
      }

      const rightAt = parseMillis(right.eventAt) ?? 0;
      const leftAt = parseMillis(left.eventAt) ?? 0;
      return rightAt - leftAt;
    });
}
