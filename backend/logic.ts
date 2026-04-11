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

// allowing everyone to send join request
const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<GameState> = (ctx, logger, nk, dispatcher, tick, state, presence, metadata) => {
    return{
        state,
        accept:true
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
  
  if (state.players.length === 2) {
    dispatcher.broadcastMessage(1, JSON.stringify(state));
    logger.info("Match is full. Broadcasting initial state.");
  }
  return { state };
};

const matchLoop: nkruntime.MatchLoopFunction<GameState> =  (ctx, logger, nk, dispatcher, tick, state, messages) =>{
    for(const message of messages){
        if(state.winner !== null) continue;
        
        // move + player
        const messageData = JSON.parse(nk.binaryToString(message.data)); 
        const cellIndex = messageData.index;
        const playerIndex = state.players.indexOf(message.sender.userId);
        const playerNumber = playerIndex + 1;

        // validation
        const isTheirTurn = (playerNumber === state.turn);
        const isCellEmpty = (state.board[cellIndex]===0);
        
        // execute move
        if(isTheirTurn && isCellEmpty){
            state.board[cellIndex] = playerNumber;
            const result =checkWinner(state.board);
            if(result !== null){
                state.winner = result;
            }else{
                // pass on the move
                state.turn = (state.turn===1) ? 2:1;
            }

            // dispatch board update event
            dispatcher.broadcastMessage(1,JSON.stringify(state));
        }else{
            logger.debug("Invalid move attempt by %s", message.sender.userId);
        }
    }

    return {state};
}

const matchLeave: nkruntime.MatchLeaveFunction<GameState> = (ctx, logger, nk, dispatcher,tick,  state, presences) =>{
    for(const presence of presences){
        state.players = state.players.filter((id:string) => id != presence.userId);
        logger.info("User %s left the match",presence.userId);
    }
    return {state};
}

const matchTerminate: nkruntime.MatchTerminateFunction<GameState> = (ctx, logger, nk, dispatcher, tick, state, graceSeconds) =>{
    return {state};
}

// external comm with match
const matchSignal : nkruntime.MatchSignalFunction<GameState> = (ctx, logger, nk, dispatcher, tick, state, data) => {
    return{
        state,
        result:data
    };
};

const InitModule: nkruntime.InitModule = function (ctx, logger, nk, initializer){
    initializer.registerMatch("tictactoe",{
        matchInit,
        matchJoinAttempt,
        matchJoin,
        matchLoop,
        matchLeave,
        matchTerminate,
        matchSignal
    });
    logger.info("Tic-Tac-Toe authoritative module loaded.");
}

export default InitModule;