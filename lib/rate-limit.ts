import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis";

let limiter: Ratelimit | null = null;

export function getScoreSubmitLimiter() {
  const redis = getRedis();

  if (!redis) {
    return null;
  }

  limiter ??= new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "snake:ratelimit:score"
  });

  return limiter;
}
