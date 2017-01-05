const MAX_DEPTH = 1
const POSITIONS = {
  DEFAULT:      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  MATE_IN_ONE:  'r3k1nr/p1pp1ppp/bpnbp3/6Nq/2PPN3/4P3/PP1BBPPP/R2Q1RK1 b KQkq - 0 1',
  MATE_IN_TWO:  'COMING SOON',
  MATE_IN_THREE:'COMING SOON',
  ROOK_ONLY:    'COMING SOON',
  TWO_ROOKS:    'COMING SOON',
  QUEEN_ONLY:   'COMING SOON',
  ADVANCED:     'rnb1k1nr/2pp1ppp/4p3/ppq5/8/P1N1P3/1P1B1PPP/R2QKBNR w KQkq - 0 1'
}

// change this to change starting position
const STARTING_POSITION = POSITIONS.DEFAULT





let nodesVisited    = 0
let nodesPossible   = 0
let maxCaptureDepth = 0



const makeMove = function () {
  console.time('Decision Time')

  // Initilize current board
  const fen = buildValidFen(board, 'b')
  const symGame = new Chess(fen)
  const moves = symGame.moves()

  nodesPossible = 0
  nodesVisited = 0

  let gameTree = buildGameTree(symGame, MAX_DEPTH, -100)
  let bestMove = getLeastWorstMove(gameTree).move

  console.log(nodesVisited + '/' + nodesPossible)
  console.log('game tree: ', gameTree)

  game.move(bestMove)

  if (blackCanCastle){
    if (bestMove[0] === 'K' || bestMove === 'O-O' || bestMove[0] === 'O-O-O') blackCanCastle = false
  }
  board.position(game.fen())
  updateStatus()
  console.timeEnd('Decision Time')
}





const staticCaptureExchange = (symGame, square, color, move) => {

  // Filter moves that capture on the requested square
  let moves = symGame.moves().filter((move) => {

    const isCapture = move.indexOf('x') > -1
    const isSquare = move.slice(-2) === square

    return isCapture && isSquare
  })

  // console.log('s:', moves)
  nodesVisited  += moves.length
  nodesPossible += symGame.moves().length

  // terminal node
  if (moves.length === 0) {
    return new Node(symGame.fen(), move, getMaterialDelta(symGame.fen()) + getPositionalDelta(symGame), null)
  }


  let responses = {}

  for (let i = 0, len = moves.length; i < len; ++i) {
    symGame.move(moves[i])
    responses[moves[i]] = staticCaptureExchange(symGame, square, color, moves[i])
    symGame.undo()
  }

  const bestDelta = findBestDelta(symGame, responses)

  return new Node(symGame.fen(), move, bestDelta, responses)
}




// Applies every possible capture at position 'square'. Returns the optimal case scenario for each player.
// color 1 = black, color 2 = white
const dynamicCaptureExchange = (symGame, square, color, move) => {

  maxCaptureDepth++

  let moves = sanitizeMoves(symGame.moves().filter((move) => move.indexOf('x') > -1))
  const efficientTrades = filterEfficientCaptures(moves, symGame)

  nodesVisited  += efficientTrades.length
  nodesPossible += symGame.moves().length



  if (efficientTrades.length !== 0){
    moves = efficientTrades
  }

  let responses = {}

  // terminal node
  if (moves.length === 0 || maxCaptureDepth === 4) {
    maxCaptureDepth--
    return new Node(symGame.fen(), move, getMaterialDelta(symGame.fen()) + getPositionalDelta(symGame), null)
  } else if (maxCaptureDepth === 4) {
    /* switch to static capture exchanges */
    // for (let i = 0, len = moves.length; i < len; ++i) {
    //   let currSquare = move.slice(-2)
    //   symGame.move(moves[i])
    //   responses[moves[i]] = staticCaptureExchange(symGame, currSquare, color, moves[i])
    //   symGame.undo()
    // }
  } else {
    /* continue executing dynamic static exchange */
    for (let i = 0, len = moves.length; i < len; ++i) {
      symGame.move(moves[i])
      responses[moves[i]] = dynamicCaptureExchange(symGame, square, color, moves[i])
      symGame.undo()
    }
  }

  const bestDelta = findBestDelta(symGame, responses)

  maxCaptureDepth--

  return new Node(symGame.fen(), move, bestDelta, responses)
}





const buildGameTree = (symGame, depth, parentWorstDelta, move = '') => {
  // console.log('depth: ', depth)
  let moves     = symGame.moves()
  const captures = sanitizeMoves(moves.filter((move) => move.indexOf('x') > -1))

  nodesVisited  += captures.length
  nodesPossible += symGame.moves().length

  let fen       = symGame.fen()

  const responses = {}
  let branchWorstDelta = 100


  // captures = filterEfficientCaptures(captures, symGame)


  // Evalute capture sequences
  for (let i = 0, len = captures.length; i < len; ++i) {

    const currMove = captures[i]

    symGame.move(currMove)
    responses[currMove] = dynamicCaptureExchange(symGame, currMove.slice(-2), 1, currMove)

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
  if (depth === 0) {
    let currentPositionDelta = getMaterialDelta(symGame.fen()) + getPositionalDelta(symGame)
    if (currentPositionDelta < branchWorstDelta){
        return new Node(symGame.fen(), move, currentPositionDelta, responses)
    } else {
        return new Node(symGame.fen(), move, branchWorstDelta, responses)
    }
  }

  nodesVisited += moves.length - captures.length

  // razer filter non-capture moves
  if (depth === MAX_DEPTH) {
    moves = moves.filter((move) => move.indexOf('x') === -1)
  } else {
    moves = razerFilterMoves(symGame, moves.filter((move) => move.indexOf('x') === -1), MAX_DEPTH - depth + 1)
  }

  // Evaluate all positional sequences
  for (let i = 0, len = moves.length; i < len; ++i) {

    const currMove = moves[i]

    let preFen = symGame.fen()

    symGame.move(currMove)

    responses[currMove] = buildGameTree(symGame, depth - 1, parentWorstDelta, currMove)

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
