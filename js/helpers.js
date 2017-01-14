/*
  This file holds all the helpers that are used by deepdarmin.js
*/

//TODO razer above current delta or quarter of moves
//TODO increase MAX_DEPTH late game and able to mate with 2 rooks, 1 rook, or queen.




/*  Takes a fen string and computes the material difference from black and white.
 @param   {String}  valid fen string
 @return  {Integer} delta from black's perspective
*/
function getMaterialDelta (fen) {
  //TODO finite state machine delta calculation apply 1 delta change per move

  let score = 0

  const board = fen.split(' ')[0].split('/')

  for (let i = 0, len = fen.length; i < fen.length; ++i) {

    if (fen[i] === ' ') return score

    if      (fen[i] === 'p') score += 1
    else if (fen[i] === 'P') score -= 1
    else if (fen[i] === 'n') score += 3
    else if (fen[i] === 'N') score -= 3
    else if (fen[i] === 'b') score += 3
    else if (fen[i] === 'B') score -= 3
    else if (fen[i] === 'r') score += 5
    else if (fen[i] === 'R') score -= 5
    else if (fen[i] === 'q') score += 9
    else if (fen[i] === 'Q') score -= 9
  }

  return score
}


let store = {
  materialDelta: 0,
  materialHistory: []
}

const material = {
  'p': 1,
  'n': 3,
  'b': 3,
  'r': 5,
  'q': 9
}




//TODO make it less side-effecty
// Takes as input a piece object and updates the materialDelta
function updateMaterialDelta(symGame, move){


  const xIndex = move.indexOf('x')

  let piece
  if (xIndex !== -1){
    piece = symGame.get(move.substr(xIndex + 1, 2))
  } else if (move.slice(-1) === '*' || move.slice(-1) === '#'){
    piece = symGame.get(move.substr(move.length - 2, move.length - 1))
  } else {
    piece = symGame.get(move.substr(move.length - 2, move.length))
  }

  store.materialHistory.push(store.materialDelta)

  if (piece === null) return

  store.materialDelta += (material[piece.type] * ((piece.color === 'w') ? 1 : -1))
}


// Undoes the most recent update to material delta
function undoUpdateMaterialDelta(){
  store.materialDelta = store.materialHistory.pop()
}


/*  Takes a fen string and computes the positional pawn difference from black and white.
 @param   {String}  valid fen string
 @return  {Integer} delta from black's perspective
*/
function getPawnPositionDelta (fen) {

  let score = 0
  let row   = 0


  for (let i = 0, len = fen.split(' ')[0].length; i < len; ++i) {
    if (fen[i] === 'p')      { score += 0.01 * row }        // black pawn
    else if (fen[i] === 'P') { score -= 0.01 * (6 - row) }  // white pawn
    else if (fen[i] === '/') ++row
  }

  return score

}



/*  Takes a fen string and computes the positional difference from black and white.
 @param   {String}  valid fen string
 @return  {Integer} delta from black's perspective
*/
function getPositionalValue (moves, turn) {

  const denominator = 12
  let value = 0

  for (let i = 0, len = moves.length; i < len; ++i) {

    if      (moves[i][0] === 'N') value += 1 / denominator
    else if (moves[i][0] === 'B') value += 1 / denominator
    else if (moves[i][0] === 'R') value += 1 / denominator / 2
    else if (moves[i][0] === 'Q') value += 1 / denominator / 12
    else if (moves[i][0] === 'K') value += 1 / denominator * 3

    //TODO rewrite this check functionally
    if (moves[i][0].indexOf('x') !== -1 || moves[i][0].indexOf('+') !== -1) {
      value += 0.1
    }
  }

  return value
}



/* totally untested ... this will blow your game store/history  */
// must use symGame.load(fen) to reload the position, .undo() stops working
function getOpponentMoves (symGame) {
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



function getPositionalDelta (symGame, allMoves) {

  let moves = symGame.moves()

  // checkmate and stalemate avoidance
  //TODO, seek stale mate if winning, avoid stalemate if losing
  //TODO, apply some reasoning to other draws, like 3 fold repitition, 50 moves, insufficient material
  if (moves.length === 0){

    if (symGame.in_checkmate())
      return (symGame.turn() === 'b') ? -30000 : 30000

    // stalemate desirable only when behind
    if (store.materialDelta > 0)
      return 30000
    else {
      return -30000
    }
  }

  if (symGame.turn() === 'b')
    return getPositionalValue(allMoves) - getPositionalValue(getOpponentMoves(symGame))
  else {
    return getPositionalValue(getOpponentMoves(symGame)) - getPositionalValue(allMoves)
  }
}


function getSquareValue (symGame, square) {
  let piece = symGame.get(square)

  if (piece !== null) return getPieceValue(piece.type)
  else return 0
}



function getPieceValue (piece) {
  if (piece === 'B' || piece === 'N' || piece === 'n' || piece === 'b') return 3
  if (piece === 'R' || piece === 'r') return 5
  if (piece === 'Q' || piece === 'q') return 9
  else return 1
}



function getLeastWorstMove (gameTree) {

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



/*
  Filter only efficient exchanges where less valuable pieces capture more valuable pieces.
  includes checks
*/
function filterEfficientCaptures (moves, symGame) {

  const efficientTrades = []

  for (let i = 0, len = moves.length; i < len; ++i) {

    const move = moves[i]

    if (move.slice(-1) === '+' || move.slice(-1) === '#') {
      efficientTrades.push(move.substring(0, move.length - 1))
    } else if (move.indexOf('x') > -1) {

      const friendlyPieceValue  = getPieceValue(move[0])
      const enemyPieceValue     = getSquareValue(symGame, move.slice(-2))

      if (friendlyPieceValue <= enemyPieceValue){
        efficientTrades.push(move)
      }
    }
  }

  return efficientTrades
}



function getCaptureMovesOnly(allMoves) {

  let moves = []

  for (let i = 0, len = allMoves.length; i < len; ++i){

    if (allMoves[i].slice(-1) === '+' || allMoves[i].slice(-1) === '#') {
      moves.push(allMoves[i].substring(0, allMoves[i].length - 1))
    } else if (allMoves[i].indexOf('x') > -1) {
      moves.push(allMoves[i])
    }

  }

  return moves
}



function organizeMoveByType(allMoves) {

  const moves = {
    captures: [],
    positional: []
  }

  let flag = false

  for (let i = 0, len = allMoves.length; i < len; ++i){

    // Checks
    if (allMoves[i].slice(-1) === '+' || allMoves[i].slice(-1) === '#') {
      moves.captures.push(allMoves[i].substring(0, allMoves[i].length - 1))
    } else if (allMoves[i].indexOf('x') !== -1) {
      moves.captures.push(allMoves[i])
    } else {
      moves.positional.push(allMoves[i])
    }

  }

  return moves
}



// find best case scenario down the capture route
function findBestDelta(symGame, responses, allMoves){

  const isBlackTurn = symGame.turn() === 'b'

  let bestDelta = (isBlackTurn) ? -30000 : 30000

  if (isBlackTurn) {
    for (let key in responses) {
      if (responses.hasOwnProperty(key)) {
        if (responses[key].delta > bestDelta) bestDelta = responses[key].delta
      }
    }

  } else {

    for (let key in responses) {
      if (responses.hasOwnProperty(key)) {
        if (responses[key].delta < bestDelta) bestDelta = responses[key].delta
      }
    }

  }

  /* evaluate current position, this is relevant when a player would
  opt not to capture and instead hold the current position */
  const currDelta = store.materialDelta + getPositionalDelta(symGame, allMoves)
  if (isBlackTurn && currDelta > bestDelta) {
    bestDelta = currDelta
  } else if (!isBlackTurn && currDelta < bestDelta) {
    bestDelta = currDelta
  }

  return bestDelta
}



// razoring, ignore moves that worsen the opponent's position
// only positional moves, no captures
function razorFilter(symGame, moves, alpha){

  let razeredMoves = []

  for (let i = 0, len = moves.length; i < len; ++i) {
    symGame.move(moves[i])

    const delta = getPositionalDelta(symGame, symGame.moves())

    razeredMoves.push({
      move: moves[i],
      delta: getPositionalDelta(symGame, symGame.moves())
    })

    symGame.undo()
  }

  razeredMoves.sort((a, b) => { return a.delta - b.delta })

  razeredMoves = razeredMoves.slice(0, razeredMoves.length / 4)

  const moves2 = []

  for (let i = 0, len = razeredMoves.length; i < len; ++i){
    moves2.push(razeredMoves[i].move)
  }

  return moves2
}






function Node (fen, move, delta, responses) {
  this.fen = fen
  this.move = move
  this.delta = delta
  this.responses = responses
}
