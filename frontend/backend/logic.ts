type GameState = {
    board: number[];
    players: string[];
    turn: number;
    winner: number|null;
};


const checkWinner = (board: number[]): number | null=>{
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // row win
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // col win
        [0, 4, 8], [2, 4, 6] // diagonal win
    ];

    for(let [a,b,c] of lines){
        if(board[a]!==0 && board[a]===board[b] && board[b]===board[c]){
            return board[a];
        }
    }

    if(board.every(cell => cell!==0)) return 0; // draw
    return null;
};

const matchInit: nkruntime.MatchInitFunction<GameState> = (ctx, logger, nk, params) => {
    const state : GameState = {
        board : Array(9).fill(0),
        players: [],
        turn: 1,
        winner:null
    };

    return{
        state,
        tickRate: 10, // run matchloop 10 times every second
        label: "tictactoe"
    };
};

const matchJoin: nkruntime.MatchJoinFunction<GameState> = (ctx, logger, nk, dispatcher, tick, state, presences) => {
  for (const presence of presences) {
    
    const canJoin = state.players.length < 2;
    const isNewPlayer = !state.players.includes(presence.userId);

    if (canJoin && isNewPlayer) {
      state.players.push(presence.userId);
      logger.info("Player %s joined the game. Total players: %d", presence.userId, state.players.length);
    }
  }

  return { state };
};

const matchLoop = nkruntime.MatchLoopFunction<GameState> = (ctx, logger, nk, dispatcher, tick, state, messages) =>{
    // game logic goes here
}

const matchLeave: nkruntime.MatchLeaveFunction<GameState> = (ctx, logger, nk, dispatcher,tick, state, presences) =>{
    for(const presence of presences){
        state.players = state.players.filter((id:string) => id != presence.userId);
        logger.info("User %s left the match",presence.userId);
    }
    return {state};
}

const matchTerminate: nkruntime.MatchTerminateFunction<GameState> = (ctx, logger, nk, dispatcher, tick, state, graceSeconds) =>{
    return {state};
}

const InitModule: mkruntime.InitModule = function (ctx, logger, nk, initializer){
    initializer.registerMatch("tictactoe",{
        matchInit,
        matchJoin,
        matchLoop,
        matchLeave,
        matchTerminate
    });
    logger.info("Tic-Tac-Toe authoritative module loaded.");
}

export default InitModule;