import React from "react";
import { GameState } from "../../types/game";

interface Props{
    state: GameState | null;
    onCellClick: (index:number) => void;
}

const GameBoard: React.FC<Props> = ({state,onCellClick}) =>{
    if(!state) return <h3>Waiting for game state...</h3>

    const renderCell = (index:number) =>{
        const value = state.board[index];
        const display = value === 1? "X" : value ===2 ? "O" : "";

         return (
            <div
                onClick={() => onCellClick(index)}
                style={{
                width: "80px",
                height: "80px",
                border: "1px solid black",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                cursor: "pointer"
                }}
            >
                {display}
            </div>
        );
    };

    return (
        <div>
            <h3>Turn: {state.turn === 1 ? "X" : "O"}</h3>
            {state.winner !== null && (
                <h2>
                    {state.winner === 0? "Draw": `Winner: ${state.winner === 1 ? "X" : "O"}`}
                </h2>
            )}

            <div
                style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 80px)"
                }}
            >
               {state.board.map((_, i) => (
                <div key={i}>
                    {renderCell(i)}
                </div>
                ))}
            </div>
        </div>
    );
}

export default GameBoard;