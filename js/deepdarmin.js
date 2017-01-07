/*
Notes:

  .moves() is computationally intensive so call it sparingly.
  Redux style board evaluation should be more performant than evaluating each more independantly
    Board evaluation currently takes 60% of the time

  checks are considered captures


Colors:

  1 is black
  2 is white

*/


//TODO generalize recursive pruning to work independantly
//TODO prioritize previously supposed 'best move' (this may improve pruning)



const MAX_DEPTH = 1
const MAX_DYNAMIC_CAPTURE_DEPTH = 2

const POSITIONS = {
  DEFAULT:        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  MATE_IN_ONE:    'r3k1nr/p1pp1ppp/bpnbp3/7q/2PPN3/4PN2/PP1BBPPP/R2Q1RK1 w KQkq - 0 1',
  MATE_IN_TWO:    'COMING SOON',
  MATE_IN_THREE:  'COMING SOON',
  MATE_THREAT:    '2k2r2/1pp2pp1/2q2n2/2P2bNp/1PBR1B2/Q1K2PP1/2r5/8 w KQ - 0 1',
  ROOK_ONLY:      'rk6/8/8/8/8/8/K7/8 w KQkq - 0 1',
  TWO_ROOKS:      'COMING SOON',
  QUEEN_ONLY:     'COMING SOON',
  TRAPPED_BISHOP: 'r1bqkbnr/1ppppppp/p7/2B5/2PPP3/5N2/1R3PPP/1N1QKB1R w KQkq - 0 1',
  TEMP:           'r1bqk2r/2p2ppp/4pn2/pp1p2B1/3Q4/4P1P1/PPP2PBP/RN1R2K1 w KQkq - 0 1',
  ADVANCED:       'rnb1k1nr/2pp1ppp/4p3/ppq5/8/P1N1P3/1P1B1PPP/R2QKBNR w KQkq - 0 1'
}

// change this to change starting position
const STARTING_POSITION = POSITIONS.DEFAULT



let nodesVisited    = 0
let nodesPossible   = 0



const makeMove = function () {

  console.time('Decision Time')

  const fen = buildValidFen(board, 'b')
  const symGame = new Chess(fen)

  nodesPossible = 0
  nodesVisited = 0

  let gameTree = buildGameTree(symGame, -100000)
  let bestMove = getLeastWorstMove(gameTree).move


  console.timeEnd('Decision Time')
  console.log(nodesVisited + '/' + nodesPossible)
  console.log('game tree: ', gameTree)


  game.move(bestMove)

  if (blackCanCastle){
    if (bestMove[0] === 'K' || bestMove === 'O-O' || bestMove[0] === 'O-O-O') blackCanCastle = false
  }
  board.position(game.fen())
  updateStatus()

}

let debugFlag = false


const staticCaptureExchange = (symGame, move) => {

  const allMoves = symGame.moves()
  const square = move.slice(-2)     //TODO unstable square calculation


  // Moves that go to same square as previous move (must be a capture)
  let moves = allMoves.filter((newMove) => {
    return newMove.slice(-2) === square
  })

  nodesVisited  += moves.length
  nodesPossible += allMoves.length

  if (moves.length === 0) {
    return new Node(symGame.fen(), move, getMaterialDelta(symGame.fen()) + getPositionalDelta(symGame, allMoves), null)
  }


  let responses = {}

  for (let i = 0, len = moves.length; i < len; ++i) {
    symGame.move(moves[i])
    responses[moves[i]] = staticCaptureExchange(symGame, moves[i])
    symGame.undo()
  }

  const bestDelta = findBestDelta(symGame, responses, allMoves)

  return new Node(symGame.fen(), move, bestDelta, responses)
}




// Exhaustively runs every capture sequence on the board until dynamic capture exchange depth limit is reached.
const dynamicCaptureExchange = (symGame, move, depth = 0) => {

  const allMoves = symGame.moves()

  let moves = filterEfficientCaptures(allMoves, symGame)

  if (moves.length === 0) {
    moves = getCaptureMovesOnly(allMoves)
  }

  nodesVisited  += moves.length
  nodesPossible += allMoves.length

  let responses = {}


  if (moves.length === 0) {
    return new Node(symGame.fen(), move, getMaterialDelta(symGame.fen()) + getPositionalDelta(symGame, allMoves), null)

  } else if (depth === MAX_DYNAMIC_CAPTURE_DEPTH) {
    /* switch to static capture exchanges */
    // for (let i = 0, len = moves.length; i < len; ++i) {
    //
    //   symGame.move(moves[i])
    //   responses[moves[i]] = staticCaptureExchange(symGame, moves[i])
    //   symGame.undo()
    //
    // }
  } else {
    /* continue executing dynamic static exchange */
    for (let i = 0, len = moves.length; i < len; ++i) {
      symGame.move(moves[i])

      responses[moves[i]] = dynamicCaptureExchange(symGame, moves[i], depth + 1)

      symGame.undo()
    }
  }

  const bestDelta = findBestDelta(symGame, responses, allMoves)

  return new Node(symGame.fen(), move, bestDelta, responses)
}





const buildGameTree = (symGame, parentWorstDelta, move = '', depth = 0) => {
  console.log('...')
  const rawMoves    = symGame.moves()
  const allMoves    = organizeMoveByType(rawMoves)
  const captures    = allMoves.captures
  const positional  = allMoves.positional

  nodesVisited  += captures.length
  nodesPossible += rawMoves.length

  let fen       = symGame.fen()
  let moves     = captures

  const responses = {}
  let branchWorstDelta = 100


  // Evaluate capture sequences
  for (let i = 0, len = moves.length; i < len; ++i) {

    const currMove = captures[i]

    symGame.move(currMove)

    responses[currMove] = dynamicCaptureExchange(symGame, currMove)

    if (responses[currMove].delta < parentWorstDelta) {
      symGame.undo()
      return new Node(symGame.fen(), currMove, responses[currMove].delta, responses)
    }

    if (responses[currMove].delta < branchWorstDelta) {
      branchWorstDelta = responses[currMove].delta
    }

    symGame.undo()
  }

  // Terminal nodes do not evaluate positional moves.
  if (depth === MAX_DEPTH) {
    const currDelta = getMaterialDelta(symGame.fen()) + getPositionalDelta(symGame, rawMoves)

    return new Node(symGame.fen(), move, (currDelta < branchWorstDelta) ? currDelta : branchWorstDelta, responses)
  }

  nodesVisited += rawMoves.length - captures.length


  // Apply razer filter on non-default depths
  moves = (depth === 0) ?
    positional :
    razerFilterMoves(symGame, positional, depth + 1)


  // Evaluate positional moves
  for (let i = 0, len = moves.length; i < len; ++i) {

    const currMove = moves[i]
    const preFen = symGame.fen()

    symGame.move(currMove)

    responses[currMove] = buildGameTree(symGame, parentWorstDelta, currMove, depth + 1)

    if (responses[currMove].delta < branchWorstDelta) {
      branchWorstDelta = responses[currMove].delta
    }

    symGame.load(preFen)
  }

  return new Node(symGame.fen(), move, branchWorstDelta, responses)
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
let game = new Chess(STARTING_POSITION)
let statusEl = $('#status')
let fenEl = $('#fen')
let pgnEl = $('#pgn')

var cfg = {
  draggable: true,
  position: STARTING_POSITION,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
}

board = ChessBoard('board', cfg)
updateStatus()