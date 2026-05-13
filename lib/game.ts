export type Direction = "up" | "down" | "left" | "right";

export type Point = {
  x: number;
  y: number;
};

export type GameStatus = "ready" | "running" | "paused" | "game-over";

export type GameState = {
  snake: Point[];
  food: Point;
  obstacles: Point[];
  direction: Direction;
  directionQueue: Direction[];
  score: number;
  status: GameStatus;
  startedAt: number | null;
  endedAt: number | null;
  nextObstacleAt: number | null;
  obstaclesUntil: number | null;
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
export const MAX_DIRECTION_QUEUE = 3;
export const BASE_TICK_MS = 120;
export const MIN_TICK_MS = 65;
export const SPEED_UP_EVERY_SCORE = 50;
export const SPEED_STEP_MS = 8;
export const OBSTACLE_MIN_DELAY_MS = 4_000;
export const OBSTACLE_MAX_DELAY_MS = 8_000;
export const OBSTACLE_MIN_DURATION_MS = 2_800;
export const OBSTACLE_MAX_DURATION_MS = 4_200;
export const OBSTACLE_MIN_COUNT = 4;
export const OBSTACLE_MAX_COUNT = 7;

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
    obstacles: [],
    direction: "right",
    directionQueue: [],
    score: 0,
    status: "ready",
    startedAt: now,
    endedAt: null,
    nextObstacleAt: null,
    obstaclesUntil: null
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
  directionQueue: Direction[],
  nextDirection: Direction
) {
  const lastQueuedDirection = directionQueue.at(-1) ?? currentDirection;

  if (lastQueuedDirection === nextDirection) {
    return directionQueue;
  }

  if (isOppositeDirection(lastQueuedDirection, nextDirection)) {
    return directionQueue;
  }

  if (directionQueue.length >= MAX_DIRECTION_QUEUE) {
    return directionQueue;
  }

  return [...directionQueue, nextDirection];
}

export function getNextHead(head: Point, direction: Direction): Point {
  const delta = directionDelta[direction];
  return {
    x: head.x + delta.x,
    y: head.y + delta.y
  };
}

export function getSpeedLevel(score: number) {
  return Math.floor(Math.max(0, score) / SPEED_UP_EVERY_SCORE) + 1;
}

export function getTickMs(score: number) {
  return Math.max(MIN_TICK_MS, BASE_TICK_MS - (getSpeedLevel(score) - 1) * SPEED_STEP_MS);
}

function randomInt(min: number, max: number, random: () => number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function getObstacleDelayMs(random: () => number = Math.random) {
  return randomInt(OBSTACLE_MIN_DELAY_MS, OBSTACLE_MAX_DELAY_MS, random);
}

export function getObstacleDurationMs(random: () => number = Math.random) {
  return randomInt(OBSTACLE_MIN_DURATION_MS, OBSTACLE_MAX_DURATION_MS, random);
}

export function getObstacleCount(random: () => number = Math.random) {
  return randomInt(OBSTACLE_MIN_COUNT, OBSTACLE_MAX_COUNT, random);
}

export function isOutOfBounds(point: Point, board: BoardSize = DEFAULT_BOARD) {
  return point.x < 0 || point.y < 0 || point.x >= board.width || point.y >= board.height;
}

export function hasSelfCollision(snake: Point[]) {
  const [head, ...body] = snake;
  return body.some((part) => isSamePoint(part, head));
}

export function hasObstacleCollision(head: Point, obstacles: Point[]) {
  return obstacles.some((obstacle) => isSamePoint(obstacle, head));
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
  random: () => number = Math.random,
  obstacles: Point[] = []
): Point {
  const occupied = new Set([...snake, ...obstacles].map((point) => `${point.x}:${point.y}`));
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

export function createObstacles(
  blockedPoints: Point[],
  board: BoardSize = DEFAULT_BOARD,
  random: () => number = Math.random,
  count = getObstacleCount(random)
): Point[] {
  const blocked = new Set(blockedPoints.map((point) => `${point.x}:${point.y}`));
  const freeCells: Point[] = [];

  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      if (!blocked.has(`${x}:${y}`)) {
        freeCells.push({ x, y });
      }
    }
  }

  const obstacles: Point[] = [];

  while (freeCells.length > 0 && obstacles.length < count) {
    const index = Math.floor(random() * freeCells.length);
    const [obstacle] = freeCells.splice(index, 1);
    obstacles.push(obstacle);
  }

  return obstacles;
}

function clearExpiredObstacles(state: GameState, random: () => number, now: number): GameState {
  if (state.obstaclesUntil === null || now < state.obstaclesUntil) {
    return state;
  }

  return {
    ...state,
    obstacles: [],
    obstaclesUntil: null,
    nextObstacleAt: now + getObstacleDelayMs(random)
  };
}

function maybeStartObstacleEvent(
  state: GameState,
  board: BoardSize,
  random: () => number,
  now: number
): GameState {
  if (state.obstacles.length > 0) {
    return state;
  }

  const nextObstacleAt = state.nextObstacleAt ?? now + getObstacleDelayMs(random);

  if (now < nextObstacleAt) {
    return {
      ...state,
      nextObstacleAt
    };
  }

  return {
    ...state,
    obstacles: createObstacles([...state.snake, state.food], board, random),
    nextObstacleAt: null,
    obstaclesUntil: now + getObstacleDurationMs(random)
  };
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

  const activeState = clearExpiredObstacles(state, random, now);
  const [queuedDirection, ...remainingQueue] = activeState.directionQueue;
  const direction = queuedDirection ?? activeState.direction;
  const nextHead = getNextHead(activeState.snake[0], direction);
  const ateFood = isSamePoint(nextHead, activeState.food);
  const nextSnake = ateFood
    ? [nextHead, ...activeState.snake]
    : [nextHead, ...activeState.snake.slice(0, -1)];

  if (
    isOutOfBounds(nextHead, board) ||
    hasSelfCollision(nextSnake) ||
    hasObstacleCollision(nextHead, activeState.obstacles)
  ) {
    return {
      ...activeState,
      direction,
      directionQueue: [],
      snake: nextSnake,
      status: "game-over",
      endedAt: now
    };
  }

  const nextFood = ateFood
    ? createFood(nextSnake, board, random, activeState.obstacles)
    : activeState.food;

  return maybeStartObstacleEvent(
    {
      ...activeState,
      direction,
      directionQueue: remainingQueue,
      snake: nextSnake,
      food: nextFood,
      score: ateFood ? activeState.score + POINTS_PER_FOOD : activeState.score
    },
    board,
    random,
    now
  );
}

export function getDurationMs(state: Pick<GameState, "startedAt" | "endedAt">, now = Date.now()) {
  if (!state.startedAt) {
    return 0;
  }

  return Math.max(0, (state.endedAt ?? now) - state.startedAt);
}
