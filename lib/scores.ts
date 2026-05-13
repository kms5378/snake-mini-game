import { getRedis } from "@/lib/redis";
import type { ScoreEntry, ScoreSubmission } from "@/lib/score-schema";

export const LEADERBOARD_KEY = "snake:leaderboard";
const SCORE_KEY_PREFIX = "snake:score:";

type StoredScoreEntry = Omit<ScoreEntry, "rank">;

const memoryScores: StoredScoreEntry[] = [];

function makeScoreKey(id: string) {
  return `${SCORE_KEY_PREFIX}${id}`;
}

function toEntry(stored: StoredScoreEntry, rank: number): ScoreEntry {
  return {
    ...stored,
    rank
  };
}

export async function addScore(submission: ScoreSubmission): Promise<ScoreEntry> {
  const redis = getRedis();
  const id = crypto.randomUUID();
  const stored: StoredScoreEntry = {
    id,
    nickname: submission.nickname,
    score: submission.score,
    durationMs: submission.durationMs,
    createdAt: new Date().toISOString()
  };

  if (!redis) {
    memoryScores.push(stored);
    memoryScores.sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt));
    return toEntry(stored, memoryScores.findIndex((entry) => entry.id === id) + 1);
  }

  await redis.set(makeScoreKey(id), stored);
  await redis.zadd(LEADERBOARD_KEY, {
    score: submission.score,
    member: id
  });

  const rank = await redis.zrank(LEADERBOARD_KEY, id);
  const total = await redis.zcard(LEADERBOARD_KEY);
  const descendingRank = rank === null ? total : total - rank;

  return toEntry(stored, descendingRank);
}

export async function getTopScores(limit = 20): Promise<ScoreEntry[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const redis = getRedis();

  if (!redis) {
    return memoryScores.slice(0, safeLimit).map((entry, index) => toEntry(entry, index + 1));
  }

  const ids = await redis.zrange<string[]>(LEADERBOARD_KEY, 0, safeLimit - 1, {
    rev: true
  });

  if (ids.length === 0) {
    return [];
  }

  const entries = await Promise.all(ids.map((id) => redis.get<StoredScoreEntry>(makeScoreKey(id))));

  return entries
    .map((entry, index) => (entry ? toEntry(entry, index + 1) : null))
    .filter((entry): entry is ScoreEntry => entry !== null);
}

export function clearMemoryScoresForTests() {
  memoryScores.length = 0;
}
