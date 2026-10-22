export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Returns buckets for 1..5, filling missing ones with 0. */
export function buildDistribution(groups: { rating: number; count: number }[]) {
  const map = new Map(groups.map((g) => [g.rating, g.count]));
  return [1, 2, 3, 4, 5].map((rating) => ({ rating, count: map.get(rating) ?? 0 }));
}

/** Average of persisted ratings rounded to 2 decimals; null when there are none. */
export function averageOf(avg: number | null | undefined): number | null {
  return avg === null || avg === undefined ? null : round2(avg);
}
