import React, { useEffect, useState } from 'react';
import './App.css';

import { Chess } from 'chess.ts'
import createBoardConfig from './board';

const BOARD_ID = "CHESS_BOARD"

function App() {
  const [game] = useState(new Chess())

  // const [board, setBoard] = useState(null)
  const [thirdPartyBoard, setThirdPartyBoard] = useState<any>(null)


  const makeRandomMove = () => {
    const moves = game.moves()
    const move = moves[Math.floor(Math.random() * moves.length)]
    game.move(move)
    console.log("MAKE MOVE: ", move)
    
    thirdPartyBoard.position(game.fen())
  }

  useEffect(() => {
    const { board: boardClass, config } = createBoardConfig(game)
    // @ts-expect-error
    const thirdPartyBoard = Chessboard(BOARD_ID, config)

    boardClass.setBoard(thirdPartyBoard)
    setThirdPartyBoard(thirdPartyBoard)

  }, [])

  console.log("game, board: ", game)

  return (
    <div className="App">
      <header className="App-header" onClick={makeRandomMove}>
          Make Random Move
      </header>
    </div>
  );
}

export default App;
