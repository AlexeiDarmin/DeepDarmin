/*
Notes:

  .moves() is computationally intensive so call it sparingly.
  Board evaluation with negamax takes 60% of the computation time

Colors:
  1 is black
  2 is white
*/


class Board {
  // IN_PROGRESS
  // DRAW 
  // P1 
  // P2
  // game = null

  constructor(option) {
    
    this.IN_PROGRESS = -1
    this.DRAW = 0
    this.P1 = 1
    this.P2 = 2


    if (typeof option === 'string') {
      this.game = new Chess(option)
    } else {
      this.game = option ? new Chess(option.game.fen()) : new Chess()
    }
  }

  performMove(player, move) {
    this.game.move(move)
  }

  // Return the game's winning player, if it's a draw return 0, if the game is not over return -1.
  checkStatus(board) {

    const turn = this.getPlayerTurn()

    // checkmate?
    if (this.game.in_checkmate() === true) return turn === 'w' ? 1 : 2
    // draw?
    else if (game.in_draw() === true) return 0
    // game still on
    return -1
  }

  getMaterialStatus(player) {
    const fen = this.game.fen().split(' ')[0]

    let player1Score = 0
    let player2Score = 0
    for (let i = 0; i < fen.length; ++i) {
      // room for performance improvement
      if (fen[i] === 'P') player1Score += 1
      if (fen[i] === 'N') player1Score += 3
      if (fen[i] === 'B') player1Score += 3
      if (fen[i] === 'R') player1Score += 5
      if (fen[i] === 'Q') player1Score += 9
      if (fen[i] === 'p') player2Score += 1
      if (fen[i] === 'n') player2Score += 3
      if (fen[i] === 'b') player2Score += 3
      if (fen[i] === 'r') player2Score += 5
      if (fen[i] === 'q') player2Score += 9
    }

    const isMaterialDifference = player2Score !== player1Score

    if (isMaterialDifference) {
      return player2Score > player1Score ? 1 : 2
    }
    let fen2 = this.game.fen()
    if (fen2.includes('w')) fen2 = fen2.replace("w", "b")
    if (fen2.includes('b')) fen2 = fen2.replace("b", "w")
    const symGame = new Chess(fen2)

    const player1Moves = this.game.moves()
    const player2Moves = symGame.moves()

    return player2Moves > player1Moves ? 1 : 2

  }

  // Returns all valid moves for this board
  getEmptyPositions() {
    const fen = this.game.fen()
    let moves = moveCache[fen]
    if (moves) return moves

    moves = this.game.moves()
    moveCache[fen] = moves

    return moves
  }

  getPlayerTurn() {
    return game.turn() === 'b' ? 2 : 1
  }
}

const moveCache = {}



const POSITIONS = {
  DEFAULT: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  MATE_IN_ONE: 'r3k1nr/p1pp1ppp/bpnbp3/7q/2PPN3/4PN2/PP1BBPPP/R2Q1RK1 w KQkq - 0 1',
  MATE_IN_TWO: 'COMING SOON',
  MATE_IN_THREE: 'COMING SOON',
  MATE_THREAT: '2k2r2/1pp2pp1/2q2n2/2P2bNp/1PBR1B2/Q1K2PP1/2r5/8 w KQ - 0 1',
  ROOK_ONLY: 'rk6/8/8/8/8/8/K7/8 w KQkq - 0 1',
  TWO_ROOKS: 'rkr5/8/8/8/8/8/7K/8 w KQkq - 0 1',
  QUEEN_ONLY: 'COMING SOON',
  TRAPPED_BISHOP: 'r1bqkbnr/1ppppppp/p7/2B5/2PPP3/5N2/1R3PPP/1N1QKB1R w KQkq - 0 1',
  TEMP: 'rnb1k1nr/ppppqppp/4p3/2b5/3P4/P7/1P1BPPPP/RN1QKBNR w KQkq - 0 1',
  ADVANCED: 'rnb1k1nr/2pp1ppp/4p3/ppq5/8/P1N1P3/1P1B1PPP/R2QKBNR w KQkq - 0 1'
}

let nodesVisited = 0
// refactor monte carlo to describe what kind of board and player it takes
// create a wrapper API for the chess package to communicate with mcts

const mcts = new MonteCarloTreeSearch()

let player = 1
const makeMove = function () {

  console.time('Decision Time')

  const fen = buildValidFen(board, 'b')
  const symGame = new Board(fen)

  
  const moves = symGame.game.moves()
  let move = moves[0]
  if (moves.length > 1) {
    move = mcts.findNextMove(symGame, player)
  } else {
    game.move(move)
    move = new Board(game.fen())
  }

  console.timeEnd('Decision Time')
  // debugger
  game = new Chess(move.game.fen())
  // game.move(move)
  console.log(game.fen())
  board.position(move.game.fen())
  updateStatus()
}



/*

  GAME MECHANICS

*/





var onDrop = function (source, target) {
  let currentBoard = game.fen()

  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  })

  // illegal move
  if (move === null) return 'snapback'

  window.setTimeout(makeMove, 75)

  updateStatus()
}

// do not pick up pieces if the game is over
// only pick up pieces for White
var onDragStart = function (source, piece, position, orientation) {
  if (game.in_checkmate() === true || game.in_draw() === true)
    return false
}


let whiteCanCastle = true
let blackCanCastle = true

let buildValidFen = (board, turn) => {
  let castling = ''
  if (whiteCanCastle) castling += 'KQ'
  if (blackCanCastle) castling += 'kq'
  return board.fen() + ' ' + turn + ' ' + castling + ' - 0 1'
}

var updateStatus = function () {
  var status = ''

  let moveColor
  if (game.turn() === 'b') moveColor = 'Black'
  else moveColor = 'White'

  // checkmate?
  if (game.in_checkmate() === true) status = 'Game over, ' + moveColor + ' is in checkmate.'
  // draw?
  else if (game.in_draw() === true) status = 'Game over, drawn position'
  // game still on
  else {
    status = moveColor + ' to move'
    // check?
    if (game.in_check() === true) {
      status += ', ' + moveColor + ' is in check'
    }
  }

  statusEl.html(status)
  fenEl.html(game.fen())
  pgnEl.html(game.pgn())
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
var onSnapEnd = function () {
  board.position(game.fen())
}



let board
let game = new Chess(POSITIONS.DEFAULT)
let statusEl = $('#status')
let fenEl = $('#fen')
let pgnEl = $('#pgn')

var cfg = {
  draggable: true,
  position: POSITIONS.DEFAULT,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
}

board = ChessBoard('board', cfg)

updateStatus()
