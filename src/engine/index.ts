import { Chess, Move, Piece } from "chess.ts";

enum PieceValues {
    p = 100,
    n = 300,
    b = 300,
    r = 500,
    q = 900,
}

export default class Engine {
    game
    // positive means white is ahead, negative means black is ahead
    materialValuation = 0
    positionsConsidered = 0
    searchingForPlayer = 'b'

    constructor(game: Chess) {
        this.game = game
    }

    handleMoveMade = (move: Move) => {
        // console.log("handle move made: ", move)
        if (move.captured) {
          this.materialValuation += (PieceValues[move.captured] * (move.color === "w" ? 1 : -1))
        }

        // console.log("updatematerial: ", move, this.materialValuation)
    }

    getEvaluation = () => {
        const turn = this.game.turn()

        if (turn === 'w') {
            return this.materialValuation
        } else {
            return this.materialValuation * -1
        }
    }

    makeMove = () => {
        const game = this.game

        this.positionsConsidered += 1
        // const moves = game.moves({ 
        //     verbose: true
        // })

        // const move = moves[Math.floor(Math.random() * moves.length)]

        this.searchingForPlayer = this.game.turn()
        const { evaluation, move } = this.search(3)

        console.log("search: ", move, evaluation, this.positionsConsidered)

        // @ts-expect-error
        game.move(move)

        // @ts-expect-error
        this.handleMoveMade(move)
    }

    search = (depth: number) => {
        this.positionsConsidered += 1
        if (depth === 0) {
            return {
                evaluation: this.getEvaluation(),
                move: null
            }
        }
        const game = this.game

        const moves = game.moves({ verbose: true })

        // handle gamed ended conditions
        if (moves.length === 0) {
            if (game.gameOver()) {
                return {
                    evaluation: 0,
                    move: null
                }
            }
        }

        let bestEvaluation = Number.MAX_SAFE_INTEGER * -1
        
        let bestMove = null

        moves.forEach(move => {
            const currVal = this.materialValuation
            this.makeVirtualMove(move)
            
            const { evaluation: bestNextEvaluation } = this.search(depth - 1)

            if (bestNextEvaluation * -1 > bestEvaluation) {
                bestEvaluation = bestNextEvaluation * -1
                bestMove = move
            }

            this.undoVirtualMove(currVal)
        })

        return {
            evaluation: bestEvaluation,
            move: bestMove
        }
    }

    makeVirtualMove = (move: Move) => {
        this.game.move(move)
        this.handleMoveMade(move)
    }

    undoVirtualMove = (evaluation: number) => {
        this.game.undo()
        this.materialValuation = evaluation
    }

}