export type GameMode = "classic" | "timed";

export type GameState = {
    board: number[];
    players: string[];
    usernames: string[];
    turn: number;
    winner: number | null;
    mode: GameMode;
    turnDeadline: number | null;
    turnDuration: number;
    disconnected: boolean;
};

export type LeaderboardEntry = {
    rank: number;
    userId: string;
    username: string;
    score: number;
    wins: number;
    losses: number;
    draws: number;
};