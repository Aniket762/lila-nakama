type GameMode = "classic" | "timed";

type GameState = {
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

const checkWinner = (board: number[]): number | null => {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (let [a, b, c] of lines) {
        if (board[a] !== 0 && board[a] === board[b] && board[b] === board[c]) {
            return board[a];
        }
    }
    if (board.every(cell => cell !== 0)) return 0;
    return null;
};

const writeLeaderboard = (nk: nkruntime.Nakama, userId: string, won: boolean, draw: boolean) => {
    try {
        const score = won ? 3 : draw ? 1 : 0;
        nk.leaderboardRecordWrite(
            "global_rankings", userId, undefined, score, 0,
            { wins: won ? 1 : 0, losses: (!won && !draw) ? 1 : 0, draws: draw ? 1 : 0 }
        );
    } catch (_) {}
};

const matchInit: nkruntime.MatchInitFunction<GameState> = (ctx, logger, nk, params) => {
    const mode: GameMode = (params && params["mode"] === "timed") ? "timed" : "classic";
    const state: GameState = {
        board: Array(9).fill(0),
        players: [], usernames: [],
        turn: 1, winner: null,
        mode, turnDeadline: null,
        turnDuration: mode === "timed" ? 30 : 0,
        disconnected: false,
    };
    logger.info("Match init: %s mode", mode);
    return { state, tickRate: 5, label: mode };
};

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<GameState> = (
    ctx, logger, nk, dispatcher, tick, state, presence, metadata
) => ({ state, accept: state.players.length < 2 });

const matchJoin: nkruntime.MatchJoinFunction<GameState> = (
    ctx, logger, nk, dispatcher, tick, state, presences
) => {
    for (const p of presences) {
        if (state.players.length < 2 && !state.players.includes(p.userId)) {
            state.players.push(p.userId);
            state.usernames.push(p.username);
            logger.info("Player %s joined. Total: %d", p.username, state.players.length);
        }
    }
    if (state.players.length === 2) {
        if (state.mode === "timed") state.turnDeadline = Date.now() + state.turnDuration * 1000;
        dispatcher.broadcastMessage(1, JSON.stringify(state));
    }
    return { state };
};

const matchLoop: nkruntime.MatchLoopFunction<GameState> = (
    ctx, logger, nk, dispatcher, tick, state, messages
) => {
    if (state.mode === "timed" && state.winner === null && state.turnDeadline !== null
        && state.players.length === 2 && Date.now() > state.turnDeadline) {
        state.winner = state.turn === 1 ? 2 : 1;
        state.turnDeadline = null;
        const wi = state.winner - 1, li = state.turn - 1;
        if (state.players[wi]) writeLeaderboard(nk, state.players[wi], true, false);
        if (state.players[li]) writeLeaderboard(nk, state.players[li], false, false);
        dispatcher.broadcastMessage(3, JSON.stringify({ timedOut: state.turn }));
        dispatcher.broadcastMessage(1, JSON.stringify(state));
        return { state };
    }

    for (const message of messages) {
        if (message.opCode === 2) {
            dispatcher.broadcastMessage(1, JSON.stringify(state), [message.sender]);
            continue;
        }
        if (message.opCode === 1) {
            if (state.winner !== null || state.players.length < 2) continue;
            const { index: cellIndex } = JSON.parse(nk.binaryToString(message.data));
            const pIdx = state.players.indexOf(message.sender.userId);
            const pNum = pIdx + 1;
            if (pNum !== state.turn || state.board[cellIndex] !== 0) continue;

            state.board[cellIndex] = pNum;
            const result = checkWinner(state.board);
            if (result !== null) {
                state.winner = result;
                state.turnDeadline = null;
                if (result === 0) {
                    state.players.forEach(uid => writeLeaderboard(nk, uid, false, true));
                } else {
                    writeLeaderboard(nk, state.players[result - 1], true, false);
                    writeLeaderboard(nk, state.players[result === 1 ? 1 : 0], false, false);
                }
            } else {
                state.turn = state.turn === 1 ? 2 : 1;
                if (state.mode === "timed") state.turnDeadline = Date.now() + state.turnDuration * 1000;
            }
            dispatcher.broadcastMessage(1, JSON.stringify(state));
        }
    }
    return { state };
};

const matchLeave: nkruntime.MatchLeaveFunction<GameState> = (
    ctx, logger, nk, dispatcher, tick, state, presences
) => {
    for (const p of presences) {
        logger.info("Player %s left", p.userId);
        if (state.winner === null && state.players.length === 2) {
            const li = state.players.indexOf(p.userId);
            const wNum = li === 0 ? 2 : 1;
            state.winner = wNum;
            state.disconnected = true;
            writeLeaderboard(nk, state.players[wNum - 1], true, false);
            writeLeaderboard(nk, p.userId, false, false);
            dispatcher.broadcastMessage(4, JSON.stringify({ disconnectedPlayer: li + 1 }));
            dispatcher.broadcastMessage(1, JSON.stringify(state));
        }
        state.players = state.players.filter(id => id !== p.userId);
    }
    return { state };
};

const matchTerminate: nkruntime.MatchTerminateFunction<GameState> = (
    ctx, logger, nk, dispatcher, tick, state, graceSeconds
) => ({ state });

const matchSignal: nkruntime.MatchSignalFunction<GameState> = (
    ctx, logger, nk, dispatcher, tick, state, data
) => ({ state, result: data });

const matchmakerMatched: nkruntime.MatchmakerMatchedFunction = (ctx, logger, nk, matches) => {
    const mode = (matches[0]?.properties?.["mode"] as string) || "classic";
    const matchId = nk.matchCreate("tictactoe", { mode });
    logger.info("Matchmaker: %s match %s", mode, matchId);
    return matchId;
};

const getLeaderboard: nkruntime.RpcFunction = (ctx, logger, nk, payload) => {
    try {
        const records = nk.leaderboardRecordsList("global_rankings", [], 20, undefined, 0);
        const result = (records.records ?? []).map((r, i) => ({
            rank: i + 1,
            userId: r.ownerId,
            username: r.username,
            score: r.score,
            wins:   (r.metadata as any)?.wins   ?? 0,
            losses: (r.metadata as any)?.losses ?? 0,
            draws:  (r.metadata as any)?.draws  ?? 0,
        }));
        return JSON.stringify(result);
    } catch (e: any) {
        logger.error("getLeaderboard: %s", e.message);
        return JSON.stringify([]);
    }
};

var InitModule: nkruntime.InitModule = function(ctx, logger, nk, initializer) {
    initializer.registerMatch("tictactoe", {
        matchInit, matchJoinAttempt, matchJoin,
        matchLoop, matchLeave, matchTerminate, matchSignal
    });
    initializer.registerMatchmakerMatched(matchmakerMatched);
    initializer.registerRpc("get_leaderboard", getLeaderboard);
    try {
        nk.leaderboardCreate("global_rankings", false, nkruntime.SortOrder.DESCENDING, nkruntime.Operator.INCREMENTAL, "alltime", undefined);
        logger.info("Leaderboard ready.");
    } catch (_) {}
    logger.info("Tic-Tac-Toe module loaded.");
}