export type Direction = "up" | "down" | "left" | "right";

export type Point = {
  x: number;
  y: number;
};

export type GameStatus = "ready" | "running" | "paused" | "game-over";

export type GameState = {
  snake: Point[];
  food: Point;
  direction: Direction;
  pendingDirection: Direction;
  score: number;
  status: GameStatus;
  startedAt: number | null;
  endedAt: number | null;
};

export type BoardSize = {
  width: number;
  height: number;
};

export const DEFAULT_BOARD: BoardSize = {
  width: 21,
  height: 21
};

export const POINTS_PER_FOOD = 10;

const directionDelta: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

export function createInitialGameState(now = Date.now()): GameState {
  const center = {
    x: Math.floor(DEFAULT_BOARD.width / 2),
    y: Math.floor(DEFAULT_BOARD.height / 2)
  };
  const snake = [
    center,
    { x: center.x - 1, y: center.y },
    { x: center.x - 2, y: center.y }
  ];

  return {
    snake,
    food: { x: center.x + 4, y: center.y },
    direction: "right",
    pendingDirection: "right",
    score: 0,
    status: "ready",
    startedAt: now,
    endedAt: null
  };
}

export function isSamePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

export function isOppositeDirection(a: Direction, b: Direction) {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

export function queueDirection(
  currentDirection: Direction,
  pendingDirection: Direction,
  nextDirection: Direction
) {
  if (isOppositeDirection(currentDirection, nextDirection)) {
    return pendingDirection;
  }

  if (isOppositeDirection(pendingDirection, nextDirection)) {
    return pendingDirection;
  }

  return nextDirection;
}

export function getNextHead(head: Point, direction: Direction): Point {
  const delta = directionDelta[direction];
  return {
    x: head.x + delta.x,
    y: head.y + delta.y
  };
}

export function isOutOfBounds(point: Point, board: BoardSize = DEFAULT_BOARD) {
  return point.x < 0 || point.y < 0 || point.x >= board.width || point.y >= board.height;
}

export function hasSelfCollision(snake: Point[]) {
  const [head, ...body] = snake;
  return body.some((part) => isSamePoint(part, head));
}

export function createSeededRandom(seed: number) {
  let value = seed || 1;

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function createFood(
  snake: Point[],
  board: BoardSize = DEFAULT_BOARD,
  random: () => number = Math.random
): Point {
  const occupied = new Set(snake.map((point) => `${point.x}:${point.y}`));
  const freeCells: Point[] = [];

  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      if (!occupied.has(`${x}:${y}`)) {
        freeCells.push({ x, y });
      }
    }
  }

  if (freeCells.length === 0) {
    return snake[0];
  }

  return freeCells[Math.floor(random() * freeCells.length)];
}

export function tickGame(
  state: GameState,
  board: BoardSize = DEFAULT_BOARD,
  random: () => number = Math.random,
  now = Date.now()
): GameState {
  if (state.status !== "running") {
    return state;
  }

  const direction = state.pendingDirection;
  const nextHead = getNextHead(state.snake[0], direction);
  const ateFood = isSamePoint(nextHead, state.food);
  const nextSnake = ateFood
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)];

  if (isOutOfBounds(nextHead, board) || hasSelfCollision(nextSnake)) {
    return {
      ...state,
      direction,
      pendingDirection: direction,
      snake: nextSnake,
      status: "game-over",
      endedAt: now
    };
  }

  return {
    ...state,
    direction,
    pendingDirection: direction,
    snake: nextSnake,
    food: ateFood ? createFood(nextSnake, board, random) : state.food,
    score: ateFood ? state.score + POINTS_PER_FOOD : state.score
  };
}

export function getDurationMs(state: Pick<GameState, "startedAt" | "endedAt">, now = Date.now()) {
  if (!state.startedAt) {
    return 0;
  }

  return Math.max(0, (state.endedAt ?? now) - state.startedAt);
}
