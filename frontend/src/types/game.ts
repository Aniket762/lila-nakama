export type GameState = {
    board : number[];
    players: string[];
    turn: number;
    winner: number|null;
};