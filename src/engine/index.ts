import { Chess, Move } from "chess.ts";

enum PieceValues {
    p = 100,
    n = 300,
    b = 300,
    r = 500,
    q = 900,
}

export default class Engine {
    game
    materialValuation = 0

    constructor(game: Chess) {
        this.game = game
    }

    handleMoveMade = (move: Move) => {
        console.log("handle move made: ", move)
        if (move.captured) {
          this.materialValuation += (PieceValues[move.captured] * (move.color === "w" ? 1 : -1))
        }
        console.log("updatematerial: ", move, this.materialValuation)
    }

    makeMove = () => {
        const game = this.game

        const moves = game.moves({ 
            verbose: true
        })

        const move = moves[Math.floor(Math.random() * moves.length)]
        game.move(move)

        console.log("moves: ", moves)
        this.handleMoveMade(move)
    }


}