import { Chess } from "chess.ts"

enum Orientation {
    white = "white",
    black = "black"
}

class Board {
    game: Chess
    board: any

    constructor(game: Chess) {
        if (!game) {
            throw Error("no game found to attach board to")
        }
        this.game = game;
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

    onDrop = (source: string, target: string, piece: string, newPos: string, oldPos: string, orientation: Orientation) => {
        // checks to see if move is legal
        var move = this.game.move({
            from: source,
            to: target,
             // Always promotes piece to a Queen for simplicity
            promotion: 'q'
        })

        if (move === null) {
            return 'snapback'
        }
      }    
}



export default function createBoardConfig (game: Chess) {
    const board = new Board(game)

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
}
