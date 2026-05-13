import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOARD,
  GameState,
  createFood,
  createInitialGameState,
  createSeededRandom,
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

  it("keeps a non-running state unchanged on tick", () => {
    const state = createInitialGameState(1_000);

    expect(tickGame(state)).toBe(state);
  });
});
