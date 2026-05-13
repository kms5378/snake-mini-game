"use client";

import { FormEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_BOARD,
  Direction,
  GameState,
  createInitialGameState,
  getDurationMs,
  queueDirection,
  tickGame
} from "@/lib/game";
import { createGameAudio } from "@/lib/audio";
import type { ScoreEntry } from "@/lib/score-schema";

const TICK_MS = 120;
const CELL_GAP = 1;

type SubmitState = "idle" | "submitting" | "submitted" | "error";

const directionByKey: Record<string, Direction | undefined> = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right"
};

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const audioRef = useRef<ReturnType<typeof createGameAudio> | null>(null);
  const statusRef = useRef<GameState["status"]>("ready");
  const previousScoreRef = useRef(0);
  const [state, setState] = useState<GameState>(() => createInitialGameState());
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const durationMs = useMemo(() => getDurationMs(state), [state]);
  const showSubmitModal = state.status === "game-over" && submitState !== "submitted";

  const loadScores = useCallback(async () => {
    try {
      setLeaderboardError(null);
      const response = await fetch("/api/scores?limit=20", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("랭킹을 불러오지 못했습니다.");
      }

      const data = (await response.json()) as { scores: ScoreEntry[] };
      setLeaderboard(data.scores);
    } catch (error) {
      setLeaderboardError(error instanceof Error ? error.message : "랭킹 오류가 발생했습니다.");
    }
  }, []);

  useEffect(() => {
    void loadScores();
  }, [loadScores]);

  const getAudio = useCallback(() => {
    audioRef.current ??= createGameAudio();
    return audioRef.current;
  }, []);

  const startMusic = useCallback(() => {
    void getAudio()?.startMusic();
  }, [getAudio]);

  const stopMusic = useCallback(() => {
    audioRef.current?.stopMusic();
  }, []);

  useEffect(() => {
    statusRef.current = state.status;

    if (state.status !== "running") {
      stopMusic();
    }
  }, [state.status, stopMusic]);

  useEffect(() => {
    if (state.score > previousScoreRef.current) {
      getAudio()?.playScoreEffect();
    }

    previousScoreRef.current = state.score;
  }, [getAudio, state.score]);

  useEffect(() => {
    return () => {
      audioRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * scale);
    canvas.height = Math.floor(rect.height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);

    const size = Math.min(rect.width, rect.height);
    const cellSize = size / DEFAULT_BOARD.width;

    context.clearRect(0, 0, rect.width, rect.height);
    context.fillStyle = "#0a0d12";
    context.fillRect(0, 0, rect.width, rect.height);

    for (let y = 0; y < DEFAULT_BOARD.height; y += 1) {
      for (let x = 0; x < DEFAULT_BOARD.width; x += 1) {
        context.fillStyle = (x + y) % 2 === 0 ? "#111722" : "#0f141d";
        context.fillRect(
          x * cellSize + CELL_GAP,
          y * cellSize + CELL_GAP,
          cellSize - CELL_GAP,
          cellSize - CELL_GAP
        );
      }
    }

    state.snake.forEach((part, index) => {
      context.fillStyle = index === 0 ? "#8df7b3" : "#38d47b";
      context.fillRect(
        part.x * cellSize + 2,
        part.y * cellSize + 2,
        cellSize - 4,
        cellSize - 4
      );
    });

    context.fillStyle = "#ff5c7a";
    context.beginPath();
    context.arc(
      state.food.x * cellSize + cellSize / 2,
      state.food.y * cellSize + cellSize / 2,
      Math.max(cellSize * 0.34, 4),
      0,
      Math.PI * 2
    );
    context.fill();

  }, [state]);

  useEffect(() => {
    if (state.status !== "running") {
      return;
    }

    const timer = window.setInterval(() => {
      setState((current) => tickGame(current));
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [state.status]);

  const resetGame = useCallback(() => {
    stopMusic();
    setState(createInitialGameState());
    setSubmitState("idle");
    setSubmitError(null);
  }, [stopMusic]);

  const toggleStartPause = useCallback(() => {
    if (statusRef.current === "ready" || statusRef.current === "paused") {
      startMusic();
    } else {
      stopMusic();
    }

    setState((current) => {
      if (current.status === "game-over") {
        return createInitialGameState();
      }

      if (current.status === "running") {
        return {
          ...current,
          status: "paused"
        };
      }

      return {
        ...current,
        status: "running",
        startedAt: current.startedAt ?? Date.now()
      };
    });
  }, [startMusic, stopMusic]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const direction = directionByKey[event.key];

      if (!direction) {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          toggleStartPause();
        }
        return;
      }

      event.preventDefault();
      if (statusRef.current === "ready") {
        startMusic();
      }
      setState((current) => ({
        ...current,
        directionQueue: queueDirection(current.direction, current.directionQueue, direction),
        status: current.status === "ready" ? "running" : current.status
      }));
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startMusic, toggleStartPause]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    touchStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start) {
      return;
    }

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) {
      return;
    }

    const direction: Direction =
      Math.abs(deltaX) > Math.abs(deltaY)
        ? deltaX > 0
          ? "right"
          : "left"
        : deltaY > 0
          ? "down"
          : "up";

    if (statusRef.current === "ready") {
      startMusic();
    }

    setState((current) => ({
      ...current,
      directionQueue: queueDirection(current.direction, current.directionQueue, direction),
      status: current.status === "ready" ? "running" : current.status
    }));
  };

  const submitScore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState("submitting");
    setSubmitError(null);

    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nickname,
          score: state.score,
          durationMs: getDurationMs(state)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "점수 제출에 실패했습니다.");
      }

      setSubmitState("submitted");
      await loadScores();
    } catch (error) {
      setSubmitState("error");
      setSubmitError(error instanceof Error ? error.message : "점수 제출에 실패했습니다.");
    }
  };

  return (
    <main>
      <div className="app-shell">
        <section className="game-stage" aria-label="Snake game">
          <div className="top-bar">
            <div className="brand">
              <h1>Snake Mini Game</h1>
              <p>키보드 또는 스와이프로 움직이고, 게임 오버 후 랭킹에 점수를 남기세요.</p>
            </div>
            <div className="stats" aria-label="Current game stats">
              <div className="stat">
                <span>Score</span>
                <strong>{state.score}</strong>
              </div>
              <div className="stat">
                <span>Length</span>
                <strong>{state.snake.length}</strong>
              </div>
              <div className="stat">
                <span>Time</span>
                <strong>{formatDuration(durationMs)}</strong>
              </div>
            </div>
          </div>

          <div
            className="board-wrap"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            role="application"
            aria-label="Snake board"
          >
            <canvas ref={canvasRef} aria-label="Snake canvas" />
            {state.status === "ready" || state.status === "paused" ? (
              <button
                aria-label={state.status === "ready" ? "Start game from board" : "Resume game from board"}
                className="board-overlay"
                onClick={toggleStartPause}
                type="button"
              >
                <span>{state.status === "ready" ? "Start" : "Paused"}</span>
              </button>
            ) : null}
          </div>

          <div className="controls">
            <div className="button-row">
              <button className="btn primary" onClick={toggleStartPause} type="button">
                {state.status === "running" ? "Pause" : state.status === "game-over" ? "New Game" : "Start"}
              </button>
              <button className="btn" onClick={resetGame} type="button">
                Reset
              </button>
              <button className="btn" onClick={() => void loadScores()} type="button">
                Refresh Rank
              </button>
            </div>
            <span className="hint">방향키, WASD, 스와이프 지원</span>
          </div>
        </section>

        <aside className="side-panel" aria-label="Leaderboard">
          <div className="panel-header">
            <div>
              <h2>Leaderboard</h2>
              <p className="panel-copy">같은 닉네임도 매판 기록됩니다.</p>
            </div>
          </div>

          {leaderboardError ? <div className="error-state">{leaderboardError}</div> : null}

          <div className="leaderboard">
            {leaderboard.length === 0 ? (
              <div className="empty-state">아직 기록이 없습니다. 첫 점수를 남겨보세요.</div>
            ) : (
              leaderboard.map((entry) => (
                <div className="leaderboard-row" key={entry.id}>
                  <span className="rank">{entry.rank}</span>
                  <div className="player">
                    <strong>{entry.nickname}</strong>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <div className="score-value">{entry.score}</div>
                    <div className="score-meta">{formatDuration(entry.durationMs)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {showSubmitModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="score-title">
          <div className="modal">
            <h2 id="score-title">Game Over</h2>
            <p className="panel-copy">점수 {state.score}점을 랭킹에 등록합니다.</p>
            <form onSubmit={submitScore}>
              <label>
                Nickname
                <input
                  autoFocus
                  maxLength={12}
                  minLength={2}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="2-12 characters"
                  value={nickname}
                />
              </label>
              {submitError ? <div className="error-state">{submitError}</div> : null}
              <div className="modal-actions">
                <button className="btn" onClick={resetGame} type="button">
                  Skip
                </button>
                <button className="btn primary" disabled={submitState === "submitting"} type="submit">
                  {submitState === "submitting" ? "Submitting" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
