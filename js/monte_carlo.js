// store all nodes with fen keys for a transpotion table
const nodeCache = {}

class Node {
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

  getChildWithMaxScore() {
    let maxScore = Number.MIN_SAFE_INTEGER
    let child

    this.childArray.forEach(c => {
      if (c.state.winScore > maxScore) {
        maxScore = c.state.winScore
        child = c
      }
    })
    debugger
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
}



const transpotionTable = {}
let cachedTT = 0
let uncachedTT = 0

class State {
  // board
  // playerNo
  // visitCount
  // winScore

  constructor(state) {
    if (state) {
      this.board = new Board(state.board)
      this.playerNo = state.playerNo
      const fen = this.board.game.fen()

      if (transpotionTable[fen]) {
        cachedTT++
        this.visitCount = transpotionTable[fen].visitCount
        this.winScore = transpotionTable[fen].winScore
      } else {
        uncachedTT++
        this.visitCount = 0
        this.winScore = 0
        transpotionTable[fen] = this
      }
    } else {
      uncachedTT++
      this.board = new Board(null)
      this.playerNo = null
      this.visitCount = 0
      this.winScore = 0
    }
  }
  getOpponent() {
    return 3 - this.playerNo
  }
  addScore(score) {
    if (this.winScore !== Number.MIN_SAFE_INTEGER) {
      this.winScore += score
    }
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
    let decisiveMoves = getDecisiveMoves(possibleMoves)

    // Apply move ordering to consider captures frequently
    if (decisiveMoves.length > 0 && Math.random() > 0.50) {
      possibleMoves = decisiveMoves
    }

    const randomMove = possibleMoves[Math.floor((Math.random() * possibleMoves.length))]

    this.board.performMove(this.playerNo, randomMove)

    return randomMove
  }
  togglePlayer() {
    this.playerNo = 3 - this.playerNo
  }
}


let boardEvalDelta = 0

class MonteCarloTreeSearch {
  findNextMove(board, playerNo) {
    // define an end time which will act as a terminating condition
    // const end = (new Date()).getTime() + 100

    const opponent = 3 - playerNo
    let tree = new Tree()
    const rootNode = tree.root

    rootNode.state.board = board
    rootNode.state.playerNo = opponent
    boardEvalDelta = rootNode.state.board.evaluateBoard()
    console.log('boardEvalDelta:', boardEvalDelta)

    // while ((new Date()).getTime() < end) {
    let count = 0
    while (count < 300) {
      let promisingNode = this.selectPromisingNode(rootNode)
      if (promisingNode.state.board.checkStatus() === board.IN_PROGRESS) {
        this.expandNode(promisingNode)
      }
      let nodeToExplore = promisingNode
      if (promisingNode.childArray.length > 0) {
        nodeToExplore = promisingNode.getRandomChildNode()
      }
      const playoutResult = this.simulateRandomPlayout(nodeToExplore, opponent, playerNo)
      this.backPropogation(nodeToExplore, playoutResult)
      count++
    }
    const winnerNode = rootNode.getChildWithMaxScore()
    tree.root = winnerNode

    console.log('cachedTT vs uncached', cachedTT, uncachedTT, cachedTT / (cachedTT + uncachedTT) * 100)
    return winnerNode.state.board
  }

  selectPromisingNode(rootNode) {

    if (!rootNode) return rootNode
    let node = rootNode

    while (node.childArray && node.childArray.length !== 0) {
      node = findBestNodeWithUCT(node)
    }
    return node
  }

  // Populates the childArray of node
  expandNode(node) {
    const possibleStates = node.state.getAllPossibleStates()
    possibleStates.forEach(state => {
      const newNode = new Node(state)
      newNode.parent = node
      newNode.state.playerNo = node.state.getOpponent()
      node.childArray.push(newNode)
    })
  }

  // If nodeToExplore is a winning board for playerNo, then add WIN_SCORE to total winScore for playerNo.
  backPropogation(nodeToExplore, playerNo) {
    let tempNode = nodeToExplore
    while (tempNode != null) {
      tempNode.state.visitCount++
      if (tempNode.state.playerNo == playerNo) {
        tempNode.state.addScore(10)
      }
      tempNode = tempNode.parent
    }
  }

  // Heavy playout on checks and mates
  simulateDecisiveMoves(node, opponent, moves) {
    let tempNode = new Node(node)
    let tempState = tempNode.state


  }

  simulateRandomPlayout(node, opponent, playerNo) {
    let tempNode = new Node(node)
    let tempState = tempNode.state
    let boardStatus = tempState.board.checkStatus()
    if (boardStatus === opponent) {
      tempNode.parent.state.score = Number.MIN_SAFE_INTEGER
      return boardStatus
    }
    let score = 0
    let count = 0
    let moveMade
    while (boardStatus == tempState.board.IN_PROGRESS && count < 4) {
      tempState.togglePlayer()
      moveMade = tempState.randomPlay()
      boardStatus = tempState.board.checkStatus()
      if (boardStatus !== -1) {
        return boardStatus // Huge time saver for branches that end
      }
      count++
    }

    tempState.board.resolveDynamicExchanges(moveMade)

    boardStatus = tempState.board.checkStatus()
    if (boardStatus !== -1) {
      return boardStatus
    }
    return tempState.board.evaluateBoard() > boardEvalDelta ? 2 : 1
  }
}



// Functions to calculate UCT
function uctValue(totalVisit, nodeWinScore, nodeVisit) {
  if (nodeVisit == 0) {
    return Number.MAX_SAFE_INTEGER
  }
  // 1.41 is an approximation of Math.sqrt(2) which is exploration parameter
  return (nodeWinScore / nodeVisit) + Math.sqrt(2) * Math.sqrt(Math.log(totalVisit) / nodeVisit)
}

function findBestNodeWithUCT(node) {
  let parentVisit = node.state.visitCount
  let scoreList = node
    .childArray
    .map(c => uctValue(parentVisit, c.state.winScore, c.state.visitCount))
    .filter(n => !isNaN(n)) // sometimes the uct is NaN

  // room for improvement here
  const maxScore = Math.max(...scoreList)
  const index = scoreList.indexOf(maxScore)

  return node.childArray[index]
}
