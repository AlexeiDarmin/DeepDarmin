import React, { useEffect, useState } from 'react';
import './App.css';

import { Chess } from 'chess.ts'
import createBoardConfig from './board';
import Engine from './engine';

const BOARD_ID = "CHESS_BOARD"

function App() {
  const [game] = useState(new Chess())
  const [engine] = useState(new Engine(game))
  const [thirdPartyBoard, setThirdPartyBoard] = useState<any>(null)

  const makeRandomMove = () => {
    engine.makeMove()
    const fen = game.fen()
    thirdPartyBoard.position(fen)
  }

  useEffect(() => {
    const { board: boardClass, config } = createBoardConfig(game, engine.handleMoveMade)
    // @ts-expect-error
    const thirdPartyBoard = Chessboard(BOARD_ID, config)

    boardClass.setBoard(thirdPartyBoard)
    setThirdPartyBoard(thirdPartyBoard)

  }, [])

  console.log("game, board: ", game)

  return (
    <div className="App">
      <header className="App-header" onClick={makeRandomMove}>
          Make AI Move
      </header>
    </div>
  );
}

export default App;
