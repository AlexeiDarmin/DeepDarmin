// Given a fen string, returns the material between the black and white player.
let getMaterialDelta = (fen) => {
  let score = 0

  let i = 0
  while (fen[i] !== ' ') {
    let c = fen[i]
    if (c === 'p') score += 1
    else if (c === 'P') score -= 1
    else if (c === 'n') score += 3
    else if (c === 'N') score -= 3
    else if (c === 'b') score += 3
    else if (c === 'B') score -= 3
    else if (c === 'r') score += 5
    else if (c === 'R') score -= 5
    else if (c === 'q') score += 9
    else if (c === 'Q') score -= 9
    ++i
  }

  // Value of pawns as they progress
  let arr = fen.split('/')
  for (let r = 1; r < 8; ++r){
    for (let c = 0; c < arr[r].length; ++c){
      if (arr[r][c] === 'p') {
        // corner pawns half as useful (fewer offensive squares)
        if (r === 0 || r === 7) score += 0.0025 * r
        else score += 0.005 * r
      } else if (arr[r][c] === 'P') {
        // corner pawns half as useful (fewer offensive squares)
        if (r === 0 || r === 7) score -= 0.0025 * r
        else score -= 0.005 * (6 - r)
      }
    }
  }

  // Value of castling
  if (blackCanCastle) {
    if (arr[0].slice(-2) === 'k1' && (arr[1].slice(-3) === 'ppp' || arr[1].slice(-3) === 'pp1' || arr[1].slice(-3) === 'p1p')) score += 0.25
  }
  if (whiteCanCastle) {
    if (arr[7].slice(-2) === 'K1' && (arr[6].slice(-3) === 'PPP' || arr[6].slice(-3) === 'PP1' || arr[6].slice(-3) === 'P1P')) score -= 0.25
  }

  return score
}

let getPositionalValue = (moves) => {
  let val = {
    'pawn'  : 0,
    'knight': 0,
    'bishop': 0,
    'rook'  : 0,
    'queen': 0
  }

  for (let i = 0, len = moves.length; i < len; ++i) {
    let c = moves[i][0]
    if      (c === 'N' && val['knight'] < 1) val['knight']  += 1/16
    else if (c === 'B' && val['bishop'] < 1) val['bishop']  += 1/16
    else if (c === 'R' && val['rook'] < 1)   val['rook']   += 1/32
    else if (c === 'Q' && val['queen'] < 1)  val['queen'] += 1/64
  }

  let delta = val.pawn + val.knight + val.bishop + val.rook + val.queen
  console.log(delta, moves)
  return delta
}

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

let nodesVisited = 0


/* totally untested ... this will blow your game state/history  */
let getOpponentMoves = (symGame) => {
  let gamePGN = symGame.pgn()
  let tokens = symGame.fen().split(' ')
  tokens[1] = tokens[1] === 'w' ? 'b' : 'w'
  symGame.load(tokens.join(' '))

  let moves = symGame.moves()

  tokens = symGame.fen().split(' ')
  tokens[1] = tokens[1] === 'w' ? 'b' : 'w'
  symGame.load_pgn(gamePGN)

  return moves
}

let getPositionalDelta = (symGame) =>{
  if (symGame.turn() === 'b')
    return getPositionalValue(symGame.moves()) - getPositionalValue(getOpponentMoves(symGame))
  else {
    return getPositionalValue(getOpponentMoves(symGame)) - getPositionalValue(symGame.moves())
  }
}

let getPieceValue = (piece) => {
  if (piece === 'B' || piece === 'N' || piece === 'n' || piece === 'b') return 3
  if (piece === 'R' || piece === 'r') return 5
  if (piece === 'Q' || piece === 'q') return 9
  else return 1
}

let getSquareValue = (symGame, square) => {
  let piece = symGame.get(square)

  console.log(piece)

  if (piece !== null) return getPieceValue(piece.type)
  else return 0
}

// Applies every possible capture at position 'square'. Returns the optimal case scenario for each player.
// color 1 = black, color 2 = white
let maxCaptureDepth = 0
const dynamicCaptureExchange = (symGame, square, color, move) => {
  maxCaptureDepth++
  let moves = symGame.moves().filter((move) => move.indexOf('x') > -1)
  nodesVisited += moves.length



  // Collect moves where more valuable pieces capture less valuable pieces.
  // If a winning scenario is found using this rule, make the move
  // otherwise search for unprotected pieces
  let efficientMoves = []
  for (let i = 0, len = moves.length; i < len; ++i) {
    if (getPieceValue(moves[i][0]) <= getSquareValue(symGame, moves[i].slice(-2))){
      efficientMoves.push(moves[i])
    }
  }

  moves = efficientMoves

  if (moves.length === 0 || maxCaptureDepth === 4) { // no more captures available
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

  if (depth === 0) { // terminal node
    return new Node(symGame.fen(), move, getMaterialDelta(symGame.fen()) + getPositionalDelta(symGame), null)
  }

  let moves = symGame.moves()
  let captureMoves = []
  let idleMoves = []
  nodesVisited += moves.length
  let fen = symGame.fen()
  const responses = {}
  let branchWorstDelta = 100

  // console.log("considering... ", moves)

  moves.map((move) => {
    if (move.indexOf('x') === -1) idleMoves.push(move)
    else captureMoves.push(move)
  })



  // Evalute all capture sequences
  for (let i = 0, len = captureMoves.length; i < len; ++i) {
    let currMove = captureMoves[i]
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

  // Evaluate all positional sequences
  for (let i = 0, len = idleMoves.length; i < len; ++i) {
    let currMove = idleMoves[i]
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

function Node (fen, move, delta, responses) {
  this.fen = fen
  this.move = move
  this.delta = delta
  this.responses = responses
}

let getLeastWorstMove = (gameTree) => {

  let optimalDecision = {
    delta: -100
  }

  for (var key in gameTree.responses) {
    if (gameTree.responses.hasOwnProperty(key)) {
      if (gameTree.responses[key].delta > optimalDecision.delta) {
        optimalDecision = gameTree.responses[key]
      }
    }
  }

  return optimalDecision
}

const depth = 2

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
