// import board, position

class Node {
  // state
  // parent
  // childArray

  constructor(dynamicInitializer) {

    const initializingFromNothing = !dynamicInitializer

    if (initializingFromNothing) {
      this.state = new State()
      this.parent = null
      this.childArray = []
      return
    }

    const initializingFromNode = dynamicInitializer.state
    const initializingFromState = !initializingFromNode

    if (initializingFromNode) {
      this.state = new State(dynamicInitializer.state)
      this.parent = dynamicInitializer.parent
      this.childArray = dynamicInitializer.childArray.slice()
    } else if (initializingFromState) {
      this.state = new State(dynamicInitializer)
      this.parent = null
      this.childArray = []
    }
  }

  getState() {
    return this.state
  }
  getParent() {
    return this.parent
  }
  getChildArray() {
    return this.childArray
  }
  setBoard(board) {
    this.state.setBoard(board)
  }
  setPlayerNo(playerNo) {
    this.state.setPlayerNo(playerNo)
  }
  setParent(node) {
    this.parent = node
  }
  getChildWithMaxScore() {
    let maxScore = Number.MIN_SAFE_INTEGER
    let child
    this.getChildArray().forEach(c => {
      if (c.state.winScore > maxScore) {
        maxScore = c.state.winScore
        child = c
      }
    })
    
    return child
  }

  getRandomChildNode() {
    return this.childArray[Math.floor(Math.random() * this.childArray.length)]
  }
}

class Tree {
  // root

  constructor(n) {
    if (n) this.root = n
    else {
      this.root = new Node()
    }
  }
  getRoot() {
    return this.root
  }
  setRoot(node) {
    this.root = node
  }
}

class State {
  // board
  // playerNo
  // visitCount
  // winScore

  constructor(state) {
    this.board = new Board(state ? state.board : null)
    this.playerNo = state ? state.playerNo : null
    this.visitCount = state ? state.visitCount : 0
    this.winScore = state ? state.winScore : 0
  }
  getWinScore() {
    return this.winScore
  }
  getVisitCount() {
    return this.visitCount
  }
  getBoard() {
    return this.board
  }
  getOpponent() {
    return 3 - this.playerNo
  }
  getPlayerNo() {
    return this.playerNo
  }
  setBoard(board) {
    this.board = board
  }
  setPlayerNo(player) {
    this.playerNo = player
  }
  setWinScore(score) {
    this.winScore = score

  }
  addScore(score) {
    if (this.winScore !== Number.MIN_SAFE_INTEGER) {
      this.winScore += score
    }
  }
  incrementVisit() {
    this.visitCount++
  }
  getAllPossibleStates() {
    // constructs a list of all possible states from current state
    const possibleMoves = this.board.getEmptyPositions()

    const possibleStates = []

    possibleMoves.forEach(move => {
      const newState = new State({
        board: new Board(this.board),
        playerNo: 3 - this.playerNo,
        visitCount: 0,
        winScore: 0
      })
      newState.board.performMove(newState.playerNo, move)
      possibleStates.push(newState)
    })

    return possibleStates
  }
  randomPlay() {
    // get a list of all possible positions on the board and play a random move
    let possibleMoves = this.board.getEmptyPositions()
    let hasCapture = possibleMoves.find(m => m.includes('x'))

    // Apply move ordering to consider captures frequently
    if (hasCapture && Math.random() > 0.80) {
      possibleMoves = possibleMoves.filter(m => m.includes('x') || m.includes('+'))
    }

    if (hasCapture) possibleMoves.filter(m => m.includes('x'))
    // console.log(possibleMoves)
    const randomMove = possibleMoves[Math.floor((Math.random() * possibleMoves.length))]
    
    this.board.performMove(this.playerNo, randomMove)
    
    return randomMove
  }
  togglePlayer() {
    this.playerNo = 3 - this.playerNo
  }
}

class MonteCarloTreeSearch {
  findNextMove(board, playerNo) {
    // define an end time which will act as a terminating condition
    // const end = (new Date()).getTime() + 100
    const end = 2

    const opponent = 3 - playerNo
    let tree = new Tree()
    const rootNode = tree.getRoot()
    rootNode.getState().setBoard(board)
    rootNode.getState().setPlayerNo(opponent)


    // while ((new Date()).getTime() < end) {
    let count = 0
    while (count < 500) {
      let promisingNode = this.selectPromisingNode(rootNode)
      if (promisingNode.getState().getBoard().checkStatus() === board.IN_PROGRESS) {
        this.expandNode(promisingNode)
      }
      let nodeToExplore = promisingNode
      if (promisingNode.getChildArray().length > 0) {
        nodeToExplore = promisingNode.getRandomChildNode()
      }
      const playoutResult = this.simulateRandomPlayout(nodeToExplore, opponent, playerNo)
      this.backPropogation(nodeToExplore, playoutResult)
      count++
    }
    const winnerNode = rootNode.getChildWithMaxScore()
    tree.setRoot(winnerNode)
    return winnerNode.getState().getBoard()
  }

  selectPromisingNode(rootNode) {
    let node = rootNode

    while (node.getChildArray().length !== 0) {
      node = UCTInstance.findBestNodeWithUCT(node)
    }
    return node
  }

  // Populates the childArray of node
  expandNode(node) {
    const possibleStates = node.getState().getAllPossibleStates()
    possibleStates.forEach(state => {
      const newNode = new Node(state)
      newNode.setParent(node)
      newNode.getState().setPlayerNo(node.getState().getOpponent())
      node.getChildArray().push(newNode)
    })
  }

  // If nodeToExplore is a winning board for playerNo, then add WIN_SCORE to total winScore for playerNo.
  backPropogation(nodeToExplore, playerNo) {
    let tempNode = nodeToExplore
    while (tempNode != null) {
      tempNode.getState().incrementVisit()
      if (tempNode.getState().getPlayerNo() == playerNo) {
        tempNode.getState().addScore(10)
      } 
      tempNode = tempNode.getParent()
    }
  }

  // Extend this function to play out only a partial of the game.
  // CheckStatus should also return who's ahead?
  simulateRandomPlayout(node, opponent, playerNo) {
    let tempNode = new Node(node)
    let tempState = tempNode.getState()
    let boardStatus = tempState.getBoard().checkStatus()
    if (boardStatus === opponent) {
      tempNode.getParent().getState().setWinScore(Number.MIN_SAFE_INTEGER)
      return boardStatus
    }
    let count = 0
    let moveMade
    while (boardStatus == tempState.getBoard().IN_PROGRESS && count < 3) {
      tempState.togglePlayer()
      moveMade = tempState.randomPlay()
      boardStatus = tempState.getBoard().checkStatus()
      count++
    }
    tempState.getBoard().resolveDynamicExchanges(moveMade)
    if (boardStatus === -1) boardStatus = tempState.getBoard().getMaterialStatus(playerNo)
    // console.log('boardStatus', boardStatus)
    return boardStatus
  }
}


class UCT {
  construtor() { }
  uctValue(totalVisit, nodeWinScore, nodeVisit) {
    if (nodeVisit == 0) {
      return Number.MAX_SAFE_INTEGER
    }
    // 1.41 is an approximation of Math.sqrt(2) which is exploration parameter
    return (nodeWinScore / nodeVisit) + Math.sqrt(2) * Math.sqrt(Math.log(totalVisit) / nodeVisit)
  }

  findBestNodeWithUCT(node) {
    let parentVisit = node.getState().getVisitCount()
    let scoreList = node
      .getChildArray()
      .map(c => this.uctValue(parentVisit, c.getState().getWinScore(), c.getState().getVisitCount()))
    
    // room for improvement here
    const maxScore = Math.max(...scoreList)
    const index = scoreList.indexOf(maxScore)
    return node.getChildArray()[index]
  }
}

let moveDict = ['ab', 'NxE4', 'h4']
let moves = []

let count = 10000

for (let i = 0; i < count; ++i) {
  moves.push(moveDict[Math.floor(Math.random() * 3)])
}

console.log(moves)

let t1 = performance.now()
let includedMoves = []

for (let i = 0; i < count; ++i) {
  if (moves[i].includes('x') || moves[i].includes('+') || moves[i].includes('#')) {
    includedMoves.push(moves[i])
  }
}
let t2 = performance.now()

console.log('time: ', t2 - t1)


let t11 = performance.now()
let includedMoves2 = []

for (let i = 0; i < count; ++i) {
  if (moves[i].length > 3 || moves[moves.length - 1] === '+' || moves[moves.length - 1] === '#') {
    includedMoves2.push(moves[i])
  }
}
let t22 = performance.now()

console.log('time: ', t22 - t11)

let t111 = performance.now()
let includedMoves3 = []

for (let i = 0; i < count; ++i) {
  if (moves[i].indexOf('x') !== -1 || moves[i].indexOf('+') !== -1 ||moves[i].indexOf('#') !== -1) {
    includedMoves3.push(moves[i])
  }
}
let t222 = performance.now()


console.log('time: ', t222 - t111)


let t1111 = performance.now()
let includedMoves4 = []

for (let i = 0; i < count; ++i) {
  if (moves[i].charAt(1) == 'x' || moves[i].charAt(moves.length - 1) == '+' || moves[i].charAt(moves.length - 1) == '#') {
    includedMoves4.push(moves[i])
  }
}
let t2222 = performance.now()


console.log('time: ', t2222 - t1111)



let t11111 = performance.now()
let includedMoves5 = []

for (let i = 0; i < count; ++i) {
  const lastChar = moves[moves.length - 1]
  if (moves[i].length > 3 || lastChar === '+' || lastChar === '#') {
    includedMoves5.push(moves[i])
  }
}
let t22222 = performance.now()

console.log('time: ', t22222 - t11111)



const UCTInstance = new UCT()