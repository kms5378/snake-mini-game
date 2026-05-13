import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOARD,
  GameState,
  createFood,
  createInitialGameState,
  createObstacles,
  createSeededRandom,
  getSpeedLevel,
  getTickMs,
  queueDirection,
  tickGame
} from "@/lib/game";

function runningState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(1_000),
    status: "running",
    ...overrides
  };
}

describe("snake game logic", () => {
  it("prevents immediate direction reversal from the current direction", () => {
    expect(queueDirection("right", [], "left")).toEqual([]);
    expect(queueDirection("up", [], "down")).toEqual([]);
  });

  it("prevents impossible reversal against a queued direction in the same tick", () => {
    expect(queueDirection("right", ["up"], "down")).toEqual(["up"]);
  });

  it("keeps rapid corner inputs queued for upcoming ticks", () => {
    expect(queueDirection("right", ["up"], "left")).toEqual(["up", "left"]);
  });

  it("consumes queued directions one per tick", () => {
    const state = runningState({
      snake: [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
      ],
      food: { x: 5, y: 5 },
      direction: "right",
      directionQueue: ["up", "left"]
    });

    const first = tickGame(state, DEFAULT_BOARD, createSeededRandom(1), 2_000);
    const second = tickGame(first, DEFAULT_BOARD, createSeededRandom(1), 2_120);

    expect(first.snake[0]).toEqual({ x: 10, y: 9 });
    expect(first.direction).toBe("up");
    expect(first.directionQueue).toEqual(["left"]);
    expect(second.snake[0]).toEqual({ x: 9, y: 9 });
    expect(second.direction).toBe("left");
    expect(second.directionQueue).toEqual([]);
  });

  it("moves the snake forward on each tick", () => {
    const state = runningState({
      snake: [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
      ],
      food: { x: 5, y: 5 },
      direction: "right"
    });

    const next = tickGame(state, DEFAULT_BOARD, createSeededRandom(1), 2_000);

    expect(next.snake[0]).toEqual({ x: 11, y: 10 });
    expect(next.snake).toHaveLength(3);
    expect(next.status).toBe("running");
  });

  it("ends the game when the snake hits a wall", () => {
    const state = runningState({
      snake: [
        { x: DEFAULT_BOARD.width - 1, y: 0 },
        { x: DEFAULT_BOARD.width - 2, y: 0 }
      ],
      food: { x: 3, y: 3 },
      direction: "right"
    });

    const next = tickGame(state, DEFAULT_BOARD, createSeededRandom(1), 2_000);

    expect(next.status).toBe("game-over");
    expect(next.endedAt).toBe(2_000);
  });

  it("ends the game when the snake hits itself", () => {
    const state = runningState({
      snake: [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 4, y: 6 },
        { x: 4, y: 5 },
        { x: 5, y: 5 }
      ],
      food: { x: 10, y: 10 },
      direction: "up",
      directionQueue: ["left"]
    });

    const next = tickGame(state, DEFAULT_BOARD, createSeededRandom(1), 2_000);

    expect(next.status).toBe("game-over");
  });

  it("grows the snake and increases score after eating food", () => {
    const state = runningState({
      snake: [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
      ],
      food: { x: 11, y: 10 },
      direction: "right",
      score: 20
    });

    const next = tickGame(state, DEFAULT_BOARD, createSeededRandom(1), 2_000);

    expect(next.score).toBe(30);
    expect(next.snake).toHaveLength(4);
    expect(next.food).not.toEqual({ x: 11, y: 10 });
  });

  it("does not create food on the snake body", () => {
    const snake = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ];

    const food = createFood(snake, { width: 3, height: 2 }, () => 0);

    expect(snake).not.toContainEqual(food);
  });

  it("does not create food on an obstacle", () => {
    const snake = [{ x: 0, y: 0 }];
    const obstacles = [{ x: 1, y: 0 }];

    const food = createFood(snake, { width: 3, height: 1 }, () => 0, obstacles);

    expect(food).toEqual({ x: 2, y: 0 });
  });

  it("creates obstacles away from blocked cells", () => {
    const blocked = [
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ];

    const obstacles = createObstacles(blocked, { width: 4, height: 2 }, () => 0, 3);

    expect(obstacles).toHaveLength(3);
    expect(obstacles).not.toContainEqual({ x: 0, y: 0 });
    expect(obstacles).not.toContainEqual({ x: 1, y: 0 });
    expect(new Set(obstacles.map((point) => `${point.x}:${point.y}`))).toHaveProperty("size", 3);
  });

  it("schedules the first obstacle event after the game starts", () => {
    const state = runningState();

    const next = tickGame(state, DEFAULT_BOARD, () => 0, 1_000);

    expect(next.obstacles).toEqual([]);
    expect(next.nextObstacleAt).toBe(5_000);
    expect(next.obstaclesUntil).toBeNull();
  });

  it("spawns temporary obstacles when the event time arrives", () => {
    const state = runningState({
      nextObstacleAt: 1_000
    });

    const next = tickGame(state, DEFAULT_BOARD, () => 0, 1_000);

    expect(next.obstacles).toHaveLength(4);
    expect(next.obstaclesUntil).toBe(3_800);
    expect(next.nextObstacleAt).toBeNull();
    expect(next.obstacles).not.toContainEqual(next.food);
    next.snake.forEach((part) => {
      expect(next.obstacles).not.toContainEqual(part);
    });
  });

  it("clears obstacles after their visible duration and schedules another event", () => {
    const state = runningState({
      obstacles: [{ x: 2, y: 2 }],
      obstaclesUntil: 1_000
    });

    const next = tickGame(state, DEFAULT_BOARD, () => 0, 1_000);

    expect(next.obstacles).toEqual([]);
    expect(next.obstaclesUntil).toBeNull();
    expect(next.nextObstacleAt).toBe(5_000);
  });

  it("ends the game when the snake hits an obstacle", () => {
    const state = runningState({
      snake: [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
      ],
      food: { x: 3, y: 3 },
      obstacles: [{ x: 11, y: 10 }],
      direction: "right"
    });

    const next = tickGame(state, DEFAULT_BOARD, createSeededRandom(1), 2_000);

    expect(next.status).toBe("game-over");
    expect(next.endedAt).toBe(2_000);
  });

  it("keeps a non-running state unchanged on tick", () => {
    const state = createInitialGameState(1_000);

    expect(tickGame(state)).toBe(state);
  });

  it("raises speed level every 50 points", () => {
    expect(getSpeedLevel(0)).toBe(1);
    expect(getSpeedLevel(49)).toBe(1);
    expect(getSpeedLevel(50)).toBe(2);
    expect(getSpeedLevel(100)).toBe(3);
  });

  it("reduces tick interval by level with a minimum cap", () => {
    expect(getTickMs(0)).toBe(120);
    expect(getTickMs(50)).toBe(112);
    expect(getTickMs(100)).toBe(104);
    expect(getTickMs(1_000)).toBe(65);
  });
});
