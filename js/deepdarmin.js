let nodesVisited    = 0
let maxCaptureDepth = 0



const makeMove = function () {
  console.time('Decision Time')

  // Initilize current board
  const fen = buildValidFen(board, 'b')
  const symGame = new Chess(fen)
  const moves = symGame.moves()

  nodesVisited = 0

  let gameTree = buildGameTree(symGame, depth, -100)
  let bestMove = getLeastWorstMove(gameTree).move

  console.log(nodesVisited)
  console.log('game tree: ', gameTree)

  game.move(bestMove)

  if (blackCanCastle){
    if (bestMove[0] === 'K' || bestMove === 'O-O' || bestMove[0] === 'O-O-O') blackCanCastle = false
  }
  board.position(game.fen())
  updateStatus()
  console.timeEnd('Decision Time')
}



// Applies every possible capture at position 'square'. Returns the optimal case scenario for each player.
// color 1 = black, color 2 = white
const dynamicCaptureExchange = (symGame, square, color, move) => {

  maxCaptureDepth++

  let moves = symGame.moves().filter((move) => move.indexOf('x') > -1)
  nodesVisited += moves.length

  const efficientTrades = filterEfficientCaptures(moves, symGame)

  if (efficientTrades.length !== 0){
    moves = efficientTrades
  }

  // terminal node
  if (moves.length === 0 || maxCaptureDepth === 4) {
    maxCaptureDepth--
    return new Node(symGame.fen(), move, getMaterialDelta(symGame.fen()) + getPositionalDelta(symGame), null)
  }


  let responses = {}

  for (let i = 0, len = moves.length; i < len; ++i) {
    symGame.move(moves[i])
    responses[moves[i]] = dynamicCaptureExchange(symGame, square, color, moves[i])
    symGame.undo()
  }

  let bestDelta
  if (symGame.turn() === 'b') {
    bestDelta = -Infinity

    $.each(responses, function(move, response) {
      if (response.delta > bestDelta) bestDelta = response.delta
    });
  } else {
    bestDelta = Infinity
    $.each(responses, function(move, response) {
      if (response.delta < bestDelta) bestDelta = response.delta
    });
  }
  maxCaptureDepth--
  return new Node(symGame.fen(), move, bestDelta, responses)
}


const buildGameTree = (symGame, depth, parentWorstDelta, move = '') => {

  let moves     = symGame.moves()

  nodesVisited += moves.length
  let fen       = symGame.fen()

  const responses = {}
  let branchWorstDelta = 100

  let captures = moves.filter((move) => move.indexOf('x') > -1)
  console.log('filter!', captures)
  captures = filterEfficientCaptures(captures, symGame)

  console.log('captures: ', captures, depth)
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

  // Evaluate all positional sequences
  for (let i = 0, len = moves.length; i < len; ++i) {

    const currMove = moves[i]

    if (currMove.indexOf('x') === -1) {
      let preFen = symGame.fen()

      symGame.move(currMove)

      responses[currMove] = buildGameTree(symGame, depth - 1, parentWorstDelta, currMove)

      if (responses[currMove].delta < branchWorstDelta) {
        branchWorstDelta = responses[currMove].delta
      }

      symGame.load(preFen)
    }
  }

  return new Node(symGame.fen(), move, branchWorstDelta, responses)
}


/*

  GAME MECHANICS

*/





const depth = 1

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

// let fixedFen = 'r1bqk2r/p1ppbp1p/1pn1p2p/1B2P3/3P4/2P2N2/PP1N1PPP/R2Q1RK1 b KQkq - 0 1'

let board
let game = new Chess()
let statusEl = $('#status')
let fenEl = $('#fen')
let pgnEl = $('#pgn')

var cfg = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
}

board = ChessBoard('board', cfg)
updateStatus()

// makeMove()
