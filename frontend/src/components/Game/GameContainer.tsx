import React, { useEffect, useState } from "react";
import { Socket } from "@heroiclabs/nakama-js";
import GameBoard from "./GameBoard";
import { GameState } from "../../types/game";

interface Props{
    socket:Socket;
    matchId: string;
}

const GameContainer:React.FC<Props> = ({socket, matchId}) =>{
    const [state, setState] = useState<GameState|null>(null);

    // match specific data update
    useEffect(() => {
    socket.onmatchdata = (data) => {
        if (data.match_id === matchId && data.op_code === 1) { // op_code:1 for move, will create an enum for op code later
            const decoded = JSON.parse(new TextDecoder().decode(data.data));
            setState(decoded);
        }
    };
}, [socket, matchId]);

    const handleMove = (index:number) =>{
        socket.sendMatchState(matchId,1,JSON.stringify({ index }));
    }

    return <GameBoard state={state} onCellClick={handleMove} />;
};

export default GameContainer;