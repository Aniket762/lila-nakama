"use strict";
const checkWinner = (board) => {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // row win
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // col win
        [0, 4, 8], [2, 4, 6] // diagonal win
    ];
    for (let [a, b, c] of lines) {
        if (board[a] !== 0 && board[a] === board[b] && board[b] === board[c]) {
            return board[a];
        }
    }
    if (board.every(cell => cell !== 0))
        return 0; // draw
    return null;
};
const matchInit = (ctx, logger, nk, params) => {
    const state = {
        board: Array(9).fill(0),
        players: [],
        turn: 1,
        winner: null
    };
    return {
        state,
        tickRate: 10,
        label: "tictactoe"
    };
};
const matchJoinAttempt = (ctx, logger, nk, dispatcher, tick, state, presence, metadata) => {
    return {
        state,
        accept: true
    };
};
const matchJoin = (ctx, logger, nk, dispatcher, tick, state, presences) => {
    for (const presence of presences) {
        if (state.players.length < 2 && !state.players.includes(presence.userId)) {
            state.players.push(presence.userId);
            logger.info("Player %s joined. Total: %d", presence.userId, state.players.length);
        }
    }
    if (state.players.length === 2) {
        logger.info("Both players joined. Sending initial state.");
        dispatcher.broadcastMessage(1, JSON.stringify(state));
    }
    return { state };
};
const matchLoop = (ctx, logger, nk, dispatcher, tick, state, messages) => {
    for (const message of messages) {
        // ✅ Handle state request
        if (message.opCode === 2) {
            logger.info("State requested by %s", message.sender.userId);
            // 🔥 FIX: broadcast to ALL (not just sender)
            dispatcher.broadcastMessage(1, JSON.stringify(state));
            continue;
        }
        if (state.winner !== null)
            continue;
        const messageData = JSON.parse(nk.binaryToString(message.data));
        const cellIndex = messageData.index;
        const playerIndex = state.players.indexOf(message.sender.userId);
        const playerNumber = playerIndex + 1;
        const isTheirTurn = (playerNumber === state.turn);
        const isCellEmpty = (state.board[cellIndex] === 0);
        if (isTheirTurn && isCellEmpty) {
            state.board[cellIndex] = playerNumber;
            const result = checkWinner(state.board);
            if (result !== null) {
                state.winner = result;
            }
            else {
                state.turn = state.turn === 1 ? 2 : 1;
            }
            dispatcher.broadcastMessage(1, JSON.stringify(state));
        }
        else {
            logger.debug("Invalid move attempt by %s", message.sender.userId);
        }
    }
    return { state };
};
const matchmakerMatched = (ctx, logger, nk, matches) => {
    try {
        const matchId = nk.matchCreate("tictactoe", {});
        logger.info("Created authoritative match: %s", matchId);
        return matchId;
    }
    catch (e) {
        logger.error("Failed to create match: %s", e);
        throw e;
    }
};
const matchLeave = (ctx, logger, nk, dispatcher, tick, state, presences) => {
    for (const presence of presences) {
        state.players = state.players.filter((id) => id != presence.userId);
        logger.info("User %s left the match", presence.userId);
    }
    return { state };
};
const matchTerminate = (ctx, logger, nk, dispatcher, tick, state, graceSeconds) => {
    return { state };
};
const matchSignal = (ctx, logger, nk, dispatcher, tick, state, data) => {
    return {
        state,
        result: data
    };
};
var InitModule = function (ctx, logger, nk, initializer) {
    initializer.registerMatch("tictactoe", {
        matchInit, matchJoinAttempt, matchJoin,
        matchLoop, matchLeave, matchTerminate, matchSignal
    });
    initializer.registerMatchmakerMatched(matchmakerMatched);
    logger.info("Tic-Tac-Toe authoritative module loaded.");
};
