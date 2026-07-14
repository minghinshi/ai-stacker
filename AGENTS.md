# AI stacker

## Project overview

AI stacker is a toy project for learning building applications that use AI models. It will be a web application where AI models play 1v1 stacker. What's a stacker? Basically, it's Tetris, but I'm not allowed to use this name in any part of this project per the Tetris Company regulations. So, I'll use "stacker" to refer to this game.

Users can choose which two AI models to battle against each other. Once the user starts the game, both models undergo an agent loop as follows: The web application will send the AI model the state of the game, including the well and the next pieces. The AI model will respond with the sequence of actions to place the next piece. So, to place an I piece vertically at column 1, the model responds with "rotate CCW, DAS to the left, hard drop". The game continues until either a model loses or 2 minutes have elapsed.

Technology stack: Vite + TypeScript + React Compiler.

## Game rules

- A model loses when they block out.
- Use the super rotation system (SRS).
- Zero gravity. Pieces never lock until hard drop.
- Use the "7-bag" randomizer.
- Show the next 5 pieces.

Refer to the [Hard Drop wiki](https://harddrop.com/wiki/Tetris_Wiki) for Tetris terminology.

## Possible moves

- Hard drop
- Soft drop: Hard drop that doesn't lock the piece.
- DAS left: Moves piece to the leftmost position.
- DAS right: Moves piece to the rightmost position.
- Tap left: Move left by 1 tile
- Tap right: Move right by 1 tile
- Rotate clockwise
- Rotate counter-clockwise
- Hold the piece
