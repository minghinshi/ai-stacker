# AI stacker

## Project overview

AI stacker is a toy project for learning building applications that use AI models. It will be a web application where AI models play 1v1 stacker. What's a stacker? Basically, it's Tetris, but I'm not allowed to use this name in any part of this project per the Tetris Company regulations. So, I'll use "stacker" to refer to this game.

Users can choose which two AI models to battle against each other. Once the user starts the game, both models undergo an agent loop as follows: The web application will send the AI model the state of the game, including the well and the next pieces. The AI model will respond with the sequence of actions to place the next piece. So, to place an I piece vertically at column 1, the model responds with "rotate CCW, DAS to the left, hard drop". The game continues until either a model loses or 2 minutes have elapsed.

- Current status: Implementing AI agent. 1v1 not yet implemented.
- Do not use test-driven development unless I tell you to. Not all code is suitable for testing.

## Architecture

- Monorepo using `pnpm` workspaces.
- Client: `apps/web`. Uses TypeScript + React Compiler + Vite.
- Server: `apps/api`. Uses TypeScript + Express.
- The linter `oxlint` and formatter `oxfmt` are installed at the monorepo root.
- Vitest is installed in the client. No test runners are installed in the server.

## Testing instructions

- After editing the code, run the following scripts:
  - `pnpm run lint` in the monorepo root
  - `pnpm run build` in the workspace you modified
  - `pnpm run test` in the workspace you modified. The server has no tests, so skip this step if you only modified the server
- Fix any warnings or errors except `eslint(complexity)`.
- Do not commit to Git. I will do it for you.

## Game rules

Refer to the [Hard Drop wiki](https://harddrop.com/wiki/Tetris_Wiki) for Tetris terminology.

### General

- A model loses when they block out.
- Use the super rotation system (SRS).
- Zero gravity. Pieces never lock until hard drop.
- Use the "7-bag" randomizer.
- Show the next 5 pieces.

### Possible moves

- Hard drop
- Soft drop: Hard drop that doesn't lock the piece.
- DAS left: Moves piece to the leftmost position.
- DAS right: Moves piece to the rightmost position.
- Tap left: Move left by 1 tile
- Tap right: Move right by 1 tile
- Rotate clockwise
- Rotate counter-clockwise
- Hold the piece

### Sizes and locations

- The board is internally 40 rows and 10 columns. All 40 rows are rendered.
- The _visual board_ is the portion of the board in the bottom 20 rows.
- Rows are indexed from top to bottom, starting from 0, so the top row is row 0 and the bottom row is row 39.
- Pieces spawn in SRS orientation such that their bottom minos are in row 19, i.e., right outside the visual board.
- Layout considers the bottom 22 rows of the board to be inside the board element.
- This means minos above row 18 may overflow into other UI elements, which is intended.
