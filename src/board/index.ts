import { Chess, Move, Piece } from "chess.ts"

enum Orientation {
    white = "white",
    black = "black"
}

class Board {
    game: Chess
    board: any
    moveCallback

    constructor(game: Chess, moveCallback: (move: Move) => void) {
        if (!game) {
            throw Error("no game found to attach board to")
        }
        this.game = game;
        this.moveCallback = moveCallback
    }

    /**
     * Stores the third part generated board that has consumed this class
     */
    setBoard = (board: any) => {
        this.board = board
    }

    onDragStart = (source: string, piece: string, position: string, orientation: Orientation) => {
        if ((orientation === 'white' && piece.search(/^w/) === -1) ||
            (orientation === 'black' && piece.search(/^b/) === -1)) {
            return false
        }
    } 

    onDragMove = (newLocation: string, oldLocation: string, source: string, piece: string, position: string, orientation: Orientation) => {
        console.log('New location: ' + newLocation)
        console.log('Old location: ' + oldLocation)
        console.log('Source: ' + source)
        console.log('Piece: ' + piece)
        // console.log('Position: ' + Chessboard.objToFen(position))
        console.log('Orientation: ' + orientation)
        console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
    }

    /**
     * Bounces moves that are invalid for the current board state
     */
    onDrop = (source: string, target: string, piece: string, newPos: string, oldPos: string, orientation: Orientation) => {
      // checks to see if move is legal
      const move = this.game.move({
        from: source,
        to: target,
        // Always promotes piece to a Queen for simplicity
        promotion: 'q'
      })

      if (move === null) {
        return 'snapback'
      }
      
      this.moveCallback(move)
    }  
}



const createBoardConfig = (game: Chess, moveCallback: (move: Move) => void) => {
    const board = new Board(game, moveCallback)

    return {
        board, 
        config: {
            draggable: true,
            dropOffBoard: 'snapback', // this is the default
            onDragStart: board.onDragStart,
            // onDragMove: board.onDragMove,
            onDrop: board.onDrop,
            position: 'start'
        }
    }
};


export default createBoardConfig;