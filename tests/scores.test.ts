import { beforeEach, describe, expect, it } from "vitest";
import { normalizeSubmission } from "@/lib/score-schema";
import { addScore, clearMemoryScoresForTests, getTopScores } from "@/lib/scores";

describe("score validation", () => {
  it("accepts a valid score submission", () => {
    const result = normalizeSubmission({
      nickname: "player_1",
      score: 120,
      durationMs: 22_000
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid nicknames and scores", () => {
    expect(normalizeSubmission({ nickname: "x", score: 10, durationMs: 0 }).success).toBe(false);
    expect(normalizeSubmission({ nickname: "valid", score: -1, durationMs: 0 }).success).toBe(false);
    expect(normalizeSubmission({ nickname: "valid", score: 1.5, durationMs: 0 }).success).toBe(false);
  });
});

describe("memory score store", () => {
  beforeEach(() => {
    clearMemoryScoresForTests();
  });

  it("stores repeated nicknames as separate entries and sorts descending", async () => {
    await addScore({ nickname: "same", score: 10, durationMs: 1_000 });
    await addScore({ nickname: "same", score: 30, durationMs: 2_000 });
    await addScore({ nickname: "other", score: 20, durationMs: 3_000 });

    const scores = await getTopScores(10);

    expect(scores.map((entry) => entry.score)).toEqual([30, 20, 10]);
    expect(scores.filter((entry) => entry.nickname === "same")).toHaveLength(2);
    expect(scores.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });
});
