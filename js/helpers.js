/*
  This file holds all the helpers that are used by deepdarmin.js
  TODO: Support API that allows access to these methods
*/




/*  Takes a fen string and computes the material difference from black and white.
 @param   {String}  valid fen string
 @return  {Integer} delta from black's perspective
*/
function getMaterialDelta (fen) {

  let score = 0
  let i     = 0

  while (fen[i] !== ' ') {
    let c = fen[i]

    if      (c === 'p') score += 1
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

  score += getPawnPositionDelta(fen)

  //TODO value of castling
  //TODO value of mating
  //TODO value of checking

  return score
}



/*  Takes a fen string and computes the positional pawn difference from black and white.
 @param   {String}  valid fen string
 @return  {Integer} delta from black's perspective
*/
function getPawnPositionDelta (fen) {

  const arr = fen.split('/')
  const val = 0.005
  let score = 0

  for (let r = 1; r < 7; ++r){                // rows
    for (let c = 0; c < arr[r].length; ++c){  // columns

      if (arr[r][c] === 'p')      { score += val * r }        // black pawn
      else if (arr[r][c] === 'P') { score -= val * (6 - r) }  // white pawn

    }
  }

  return score

}


function getSquareFromMove(square) {
  return square.substring(square.length-3, square.length-1)
}

/*  Takes a fen string and computes the positional difference from black and white.
 @param   {String}  valid fen string
 @return  {Integer} delta from black's perspective
*/
function getPositionalValue (moves, turn) {

  const denominator = 12
  const val = {
    'pawn'  : 0,
    'knight': 0,
    'bishop': 0,
    'rook'  : 0,
    'queen': 0
  }

  for (let i = 0, len = moves.length; i < len; ++i) {

    const c = moves[i][0]

    if      (c === 'N' && val['knight'] < 1) val['knight']  += 1 / denominator
    else if (c === 'B' && val['bishop'] < 1) val['bishop']  += 1 / denominator
    else if (c === 'R' && val['rook'] < 1)   val['rook']    += 1 / denominator / 2
    else if (c === 'Q' && val['queen'] < 1)  val['queen']   += 1 / denominator / 8
  }

  let delta = val.pawn + val.knight + val.bishop + val.rook + val.queen

  return delta
}



/* totally untested ... this will blow your game state/history  */
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



function getPositionalDelta (symGame) {

  // checkmate and stalemate avoidance
  if (symGame.moves().length === 0){
    if (symGame.turn() === 'b') return -30000
    else                        return 30000
  }

  if (symGame.turn() === 'b')
    return getPositionalValue(symGame.moves()) - getPositionalValue(getOpponentMoves(symGame))
  else {
    return getPositionalValue(getOpponentMoves(symGame)) - getPositionalValue(symGame.moves())
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
*/
function filterEfficientCaptures (moves, symGame) {

  const efficientTrades = []


  for (let i = 0, len = moves.length; i < len; ++i) {

    const move = moves[i]

    if (move.indexOf('x') > -1) {

      // handling bullshit
      if (move.slice(-1) === '+') {
        moves[i] = move.substring(0, move.length - 1);
      }

      const friendlyPieceValue  = getPieceValue(move[0])
      const enemyPieceValue     = getSquareValue(symGame, move.slice(-2))

      if (friendlyPieceValue <= enemyPieceValue){
        efficientTrades.push(move)
      }
    }
  }

  return efficientTrades
}



// remove the random '+' that sometimes appears
function sanitizeMoves(moves){
  return moves.map((move) => {
    if (move.slice(-1) === '+') {
      return move.substring(0, move.length - 1)
    } else {
      return move
    }
  })
}

// find best case scenario down the capture route
function findBestDelta(symGame, responses){

  const isBlackTurn = symGame.turn() === 'b'
  /* evaluate down the capture tree */
  let bestDelta
  if (isBlackTurn) {
    bestDelta = -Infinity

    $.each(responses, function(move, response) {
      if (response.delta > bestDelta) bestDelta = response.delta
    })

  } else {
    bestDelta = Infinity
    $.each(responses, function(move, response) {
      if (response.delta < bestDelta) bestDelta = response.delta
    });
  }

  const color = (symGame.turn() === 'b') ? 1 : 0

  /* evaluate current position, this is relevant when a player would
  opt not to capture and instead hold the current position */
  const currDelta = getMaterialDelta(symGame.fen()) + getPositionalDelta(symGame)
  if (isBlackTurn && currDelta > bestDelta) {
    bestDelta = currDelta
  } else if (!isBlackTurn && currDelta < bestDelta) {
    bestDelta = currDelta
  }

  return bestDelta
}

// razoring, ignore moves that worsen the opponent's position
// only positional moves, no captures
function razerFilterMoves(symGame, moves, filterRatio){

  const currDelta = getPositionalDelta(symGame)
  let razeredMoves = [moves.length - 1]

  for (let i = 0, len = moves.length; i < len; ++i) {
    symGame.move(moves[i])

    razeredMoves.push({
      move: moves[i],
      delta: getPositionalDelta(symGame)
    })

    symGame.undo()
  }

  razeredMoves.sort((a, b) => { return a.delta - b.delta })

  razeredMoves = razeredMoves.slice(0, razeredMoves.length * (1 / (filterRatio * filterRatio)))

  const moves2 = [razeredMoves.length - 1]

  for (let i = 0, len = razeredMoves.length; i < len; ++i){
    moves2.push(razeredMoves[i])
  }

  return moves2
}






function Node (fen, move, delta, responses) {
  this.fen = fen
  this.move = move
  this.delta = delta
  this.responses = responses
}
