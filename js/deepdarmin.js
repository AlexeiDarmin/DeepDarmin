/*
Notes:

  .moves() is computationally intensive so call it sparingly.
  Redux style board evaluation should be more performant than evaluating each more independantly
    Board evaluation currently takes 60% of the time

  checks are considered captures

  rename positional to tactical moves


Colors:

  1 is black
  2 is white

*/


//TODO generalize recursive pruning to work independantly
//TODO prioritize previously supposed 'best move' (this may improve pruning)
//TODO value tempo




const MAX_DEPTH = 2
const MAX_DYNAMIC_CAPTURE_DEPTH = 2

const POSITIONS = {
  DEFAULT:        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  MATE_IN_ONE:    'r3k1nr/p1pp1ppp/bpnbp3/7q/2PPN3/4PN2/PP1BBPPP/R2Q1RK1 w KQkq - 0 1',
  MATE_IN_TWO:    'COMING SOON',
  MATE_IN_THREE:  'COMING SOON',
  MATE_THREAT:    '2k2r2/1pp2pp1/2q2n2/2P2bNp/1PBR1B2/Q1K2PP1/2r5/8 w KQ - 0 1',
  ROOK_ONLY:      'rk6/8/8/8/8/8/K7/8 w KQkq - 0 1',
  TWO_ROOKS:      'rkr5/8/8/8/8/8/7K/8 w KQkq - 0 1',
  QUEEN_ONLY:     'COMING SOON',
  TRAPPED_BISHOP: 'r1bqkbnr/1ppppppp/p7/2B5/2PPP3/5N2/1R3PPP/1N1QKB1R w KQkq - 0 1',
  TEMP:           'rnb1k1nr/ppppqppp/4p3/2b5/3P4/P7/1P1BPPPP/RN1QKBNR w KQkq - 0 1',
  ADVANCED:       'rnb1k1nr/2pp1ppp/4p3/ppq5/8/P1N1P3/1P1B1PPP/R2QKBNR w KQkq - 0 1',
  EXCHANGE:       'r1bqkb1r/1pp1npp1/p1np4/4P2p/5P2/P1N2N2/1PP1P1PP/R1BQKB1R w KQkq - 0 2'
}

// change this to change starting position
const STARTING_POSITION = POSITIONS.TEMP



let nodesVisited    = 0



const makeMove = function () {

  console.time('Decision Time')

  const fen = buildValidFen(board, 'b')
  const symGame = new Chess(fen)

  nodesVisited = 0


  store.materialHistory.push(getMaterialDelta(fen))

  // let nm = negaMax(symGame, MAX_DEPTH)

  const moves = symGame.moves()
  let max = -100000
  let move = ''


  for (let i = 0, len = moves.length; i < len; ++i) {
    symGame.move(moves[i])

    const score = -negaMax(symGame, MAX_DEPTH - 1)

    symGame.undo()

    if(score > max) {
      max = score
      move = moves[i]
    }
  }

  console.log('best: ', move, max)
  // let gameTree = buildGameTree(symGame)
  // let bestMove = getLeastWorstMove(gameTree).move

  // undoUpdateMaterialDelta()

  console.timeEnd('Decision Time')
  console.log('visited nodes: ', nodesVisited)
  // console.log('game tree: ', gameTree)


  game.move(move)

  // if (blackCanCastle){
  //   if (bestMove[0] === 'K' || bestMove === 'O-O' || bestMove[0] === 'O-O-O') blackCanCastle = false
  // }
  board.position(game.fen())
  updateStatus()

}

let debugFlag = false


const staticCaptureExchange = (symGame, move) => {

  const allMoves = symGame.moves()
  const square = move.slice(-2)     //TODO unstable square calculation
  // console.log(square)

  // Moves that go to same square as previous move (must be a capture)
  let moves = allMoves.filter((newMove) => {
    return newMove.slice(-2) === square
  })

  ++nodesVisited

  if (moves.length === 0) {
    return new Node(symGame.fen(), move, store.materialDelta + getPositionalDelta(symGame, allMoves), null)
  }


  let responses = {}

  for (let i = 0, len = moves.length; i < len; ++i) {
    updateMaterialDelta(symGame, moves[i])
    symGame.move(moves[i])
    responses[moves[i]] = staticCaptureExchange(symGame, moves[i])
    symGame.undo()
    undoUpdateMaterialDelta()

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

  ++nodesVisited

  let responses = {}


  if (moves.length === 0) {
    return new Node(symGame.fen(), move, store.materialDelta + getPositionalDelta(symGame, allMoves), null)

  } else if (depth === MAX_DYNAMIC_CAPTURE_DEPTH) {
    /* switch to static capture exchanges */
    // for (let i = 0, len = moves.length; i < len; ++i) {
    //
    //   updateMaterialDelta(symGame, moves[i])
    //
    //   symGame.move(moves[i])
    //   responses[moves[i]] = staticCaptureExchange(symGame, moves[i])
    //
    //   symGame.undo()
    //   undoUpdateMaterialDelta()
    // }
  } else {
    /* continue executing dynamic static exchange */
    for (let i = 0, len = moves.length; i < len; ++i) {
      updateMaterialDelta(symGame, moves[i])
      symGame.move(moves[i])

      responses[moves[i]] = dynamicCaptureExchange(symGame, moves[i], depth + 1)

      symGame.undo()
      undoUpdateMaterialDelta()
    }
  }

  const bestDelta = findBestDelta(symGame, responses, allMoves)

  return new Node(symGame.fen(), move, bestDelta, responses)
}





const buildGameTree = (symGame, alpha = -100000, move = '', depth = 0) => {

  const rawMoves    = symGame.moves()
  const allMoves    = organizeMoveByType(rawMoves)
  const captures    = allMoves.captures
  const positional  = allMoves.positional

  ++nodesVisited

  let fen       = symGame.fen()
  let moves     = captures

  if (moves.length === 0) {
    moves = allMoves.captures
  }

  const responses = {}
  let branchAlpha = store.materialDelta + getPositionalDelta(symGame, rawMoves)


  // Evaluate capture sequences
  for (let i = 0, len = moves.length; i < len; ++i) {

    const currMove = captures[i]

    updateMaterialDelta(symGame, currMove)
    symGame.move(currMove)

    responses[currMove] = dynamicCaptureExchange(symGame, currMove, depth)

    if (responses[currMove].delta < alpha) {
      symGame.undo()
      undoUpdateMaterialDelta()

      return new Node(symGame.fen(), currMove, responses[currMove].delta, responses)
    }

    if (responses[currMove].delta < branchAlpha) {
      branchAlpha = responses[currMove].delta
    }
    symGame.undo()
    undoUpdateMaterialDelta()

  }

  // Terminal nodes do not evaluate positional moves.
  if (depth === MAX_DEPTH) {
    let currDelta = store.materialDelta + getPositionalDelta(symGame, rawMoves)

    return new Node(symGame.fen(), move, (currDelta < branchAlpha) ? currDelta : branchAlpha, responses)
  }

  ++nodesVisited


  // Apply razer filter on non-default depths
  moves = (depth === 0) ?
    positional :
    razorFilter(symGame, positional, branchAlpha)


  // Evaluate positional moves
  for (let i = 0, len = moves.length; i < len; ++i) {

    const currMove = moves[i]
    const preFen = symGame.fen()

    symGame.move(currMove)

    responses[currMove] = buildGameTree(symGame, alpha, currMove, depth + 1)

    if (responses[currMove].delta < alpha) {
      symGame.undo()
      return new Node(symGame.fen(), currMove, responses[currMove].delta, responses)
    }

    if (responses[currMove].delta < branchAlpha) {
      branchAlpha = responses[currMove].delta
    }

    symGame.load(preFen)
  }

  const currDelta = store.materialDelta + getPositionalDelta(symGame, allMoves)
  return new Node(symGame.fen(), move, (currDelta > 30000) ? currDelta : branchAlpha, responses)
}



/*

Note! In order for negaMax to work, your Static Evaluation function must return a score
relative to the side to being evaluated. (e.g. the simplest score evaluation could be:

score = materialWeight * (numWhitePieces - numBlackPieces) * who2move

//where who2move = 1 for white, and who2move = -1 for black).

*/

// store.materialDelta + getPositionalDelta(symGame, rawMoves)

function negaMax(symGame, depth, alpha = -100000, beta = 100000, color = -1) {
  ++nodesVisited
  if (depth === 0) return (store.materialDelta * color) + getPositionalDelta(symGame, symGame.moves())

  let bestScore = -100000

  //TODO optimize via move ordering
  const moves = symGame.moves().sort((m1, m2) => m1.indexOf('x') <= m2.indexOf('x'))

  for (let i = 0, len = moves.length; i < len; ++i) {
    if (moves[i].indexOf('x') > -1) updateMaterialDelta(symGame, moves[i])
    symGame.move(moves[i])

    score = -negaMax(symGame, depth - 1, -beta, -alpha, -color)

    symGame.undo()
    if (moves[i].indexOf('x') > -1) undoUpdateMaterialDelta()

    bestScore = Math.max(bestScore, score)
    alpha     = Math.max(alpha, score)

    if (alpha >= beta) break
  }

  return bestScore
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



console.log('hello', POSITIONS.EXCHANGE)

let board
let game = new Chess(POSITIONS.EXCHAGNE)
let statusEl = $('#status')
let fenEl = $('#fen')
let pgnEl = $('#pgn')

var cfg = {
  draggable: true,
  position: POSITIONS.EXCHANGE,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
}

board = ChessBoard('board', cfg)
updateStatus()
