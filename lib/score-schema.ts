import { z } from "zod";

export const MAX_SCORE = 99_990;

export const scoreSubmissionSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2, "Nickname must be at least 2 characters.")
    .max(12, "Nickname must be 12 characters or less.")
    .regex(/^[\p{L}\p{N}_ -]+$/u, "Nickname contains unsupported characters."),
  score: z
    .number()
    .int("Score must be an integer.")
    .positive("Score must be positive.")
    .max(MAX_SCORE, "Score is outside the allowed range."),
  durationMs: z
    .number()
    .int("Duration must be an integer.")
    .min(0, "Duration must not be negative.")
    .max(60 * 60 * 1000, "Duration is outside the allowed range.")
});

export type ScoreSubmission = z.infer<typeof scoreSubmissionSchema>;

export type ScoreEntry = ScoreSubmission & {
  id: string;
  createdAt: string;
  rank: number;
};

export function normalizeSubmission(input: unknown) {
  return scoreSubmissionSchema.safeParse(input);
}
