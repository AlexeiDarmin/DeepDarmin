

// Copyright (c) 2011 Gary Linscott
// All rights reserved.

// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
// 3. The name of the author may not be used to endorse or promote products
//    derived from this software without specific prior written permission.

// THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR
// IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
// OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
// IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
// NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
// THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

// Position adjustments being used are from GarboChess by Gary Linscott: https://github.com/glinscott/Garbochess-JS

var pawnAdj =
[
  0, 0, 0, 0, 0, 0, 0, 0,
  -25, 105, 135, 270, 270, 135, 105, -25,
  -80, 0, 30, 176, 176, 30, 0, -80,
  -85, -5, 25, 175, 175, 25, -5, -85,
  -90, -10, 20, 125, 125, 20, -10, -90,
  -95, -15, 15, 75, 75, 15, -15, -95, 
  -100, -20, 10, 70, 70, 10, -20, -100, 
  0, 0, 0, 0, 0, 0, 0, 0
];

var knightAdj =
    [-200, -100, -50, -50, -50, -50, -100, -200,
      -100, 0, 0, 0, 0, 0, 0, -100,
      -50, 0, 60, 60, 60, 60, 0, -50,
      -50, 0, 30, 60, 60, 30, 0, -50,
      -50, 0, 30, 60, 60, 30, 0, -50,
      -50, 0, 30, 30, 30, 30, 0, -50,
      -100, 0, 0, 0, 0, 0, 0, -100,
      -200, -50, -25, -25, -25, -25, -50, -200
     ];

var bishopAdj =
    [ -50,-50,-25,-10,-10,-25,-50,-50,
      -50,-25,-10,  0,  0,-10,-25,-50,
      -25,-10,  0, 25, 25,  0,-10,-25,
      -10,  0, 25, 40, 40, 25,  0,-10,
      -10,  0, 25, 40, 40, 25,  0,-10,
      -25,-10,  0, 25, 25,  0,-10,-25,
      -50,-25,-10,  0,  0,-10,-25,-50,
      -50,-50,-25,-10,-10,-25,-50,-50
     ];

var rookAdj =
    [ -60, -30, -10, 20, 20, -10, -30, -60,
       40,  70,  90,120,120,  90,  70,  40,
      -60, -30, -10, 20, 20, -10, -30, -60,
      -60, -30, -10, 20, 20, -10, -30, -60,
      -60, -30, -10, 20, 20, -10, -30, -60,
      -60, -30, -10, 20, 20, -10, -30, -60,
      -60, -30, -10, 20, 20, -10, -30, -60,
      -60, -30, -10, 20, 20, -10, -30, -60
     ];

var kingAdj =
    [  50, 150, -25, -125, -125, -25, 150, 50,
       50, 150, -25, -125, -125, -25, 150, 50,
       50, 150, -25, -125, -125, -25, 150, 50,
       50, 150, -25, -125, -125, -25, 150, 50,
       50, 150, -25, -125, -125, -25, 150, 50,
       50, 150, -25, -125, -125, -25, 150, 50,
       50, 150, -25, -125, -125, -25, 150, 50,
      150, 250, 75, -25, -25, 75, 250, 150
     ];

var emptyAdj =
    [0, 0, 0, 0, 0, 0, 0, 0, 
        0, 0, 0, 0, 0, 0, 0, 0, 
        0, 0, 0, 0, 0, 0, 0, 0, 
        0, 0, 0, 0, 0, 0, 0, 0, 
        0, 0, 0, 0, 0, 0, 0, 0, 
        0, 0, 0, 0, 0, 0, 0, 0, 
        0, 0, 0, 0, 0, 0, 0, 0, 
        0, 0, 0, 0, 0, 0, 0, 0, 
     ];


var blackPawnAdj = pawnAdj.reverse()
var blackKnightAdj = knightAdj.reverse()
var blackBishopAdj = bishopAdj.reverse()
var blackRookAdj = rookAdj.reverse()
var blackKingAdj = kingAdj.reverse()