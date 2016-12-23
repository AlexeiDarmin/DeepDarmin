# DeepDarmin
Chess engine built in javascript, I may migrate this over to NPM for v1. 


I'm developing chess AI. Currently it's closer to a bot than AI, but once the ground work is setup I plan to give it the ability to update it's own decision making criteria based on experiences / performance.

<a href="https://en.wikipedia.org/wiki/Minimax">MiniMax</a> decisions evaluated via a board evalutation function that values material and positional oppurtunities. Initial naive implementations show optimal moves in the current position but fail to recognize future consequences due to the <a href="https://en.wikipedia.org/wiki/Horizon_effect">horizon effect</a>

Currently the algorithm emphasis maximum oppurtunity delta relative to opponent - moves that create the most moves for friendly pieces, and decrease the number of potential moves for the opponent. The algorithm has no concept of check-mate or the king so this will need to be addressed as a desired goal.
