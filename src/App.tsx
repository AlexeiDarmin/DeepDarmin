import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';

import { Chess } from 'chess.ts'

const BOARD_ID = "CHESS_BOARD"

function App() {
  const [game] = useState(new Chess())
  const [board, setBoard] = useState<any>(null)

  const makeRandomMove = () => {
    const moves = game.moves()
    const move = moves[Math.floor(Math.random() * moves.length)]
    game.move(move)
    console.log("MAKE MOVE: ", move)
    
    board.position(game.fen())
  }

  useEffect(() => {
    if (!board) {
      // @ts-expect-error
      setBoard(Chessboard(BOARD_ID, 'start'))
    }
  }, [])

  console.log("game, board: ", game, board)

  return (
    <div className="App">
      <header className="App-header" onClick={makeRandomMove}>
          Make Random Move
      </header>
    </div>
  );
}

export default App;
