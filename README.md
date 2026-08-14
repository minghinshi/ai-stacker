# AI stacker

A toy project for me to learn and showcase how to use, make, and optimise AI agents. The repository is almost entirely written by [Hermes Agent](https://hermes-agent.nousresearch.com/docs/). I am responsible for the ideas and directions of the project, as well as prompting the coding agent.

This is a web application where a large language model (LLM) plays a familiar game where you [stack tetrominos to form complete lines](https://en.wikipedia.org/wiki/Tetris). The application includes the current state of the game in the prompt and instructs the LLM to make moves. It then parses the move, actually makes them, then prompts the model again, repeating until the model tops out (i.e., loses).

## Dependencies

- Linux or WSL
- Node version 26
- pnpm version 11
- An API key from [OpenRouter](https://openrouter.ai/) (requires money)

## Setup

1. Clone the repository.
2. In `apps/api/`, create a file called `.env` with the following content: `OPENROUTER_API_KEY=insert-key-here`. Replace `insert-key-here` with your OpenRouter API key.
3. Optional: In `apps/web/src/hooks/useAgent.ts`, change `MODEL` to the identifier of the LLM that you want to use, which can be found on OpenRouter. Default: MiniMax M3.
4. Run `pnpm -F api run dev`. This starts up a proxy server for sending and receiving prompts.
5. In another terminal, run `pnpm -F web run dev`.
6. View the web application at <http://localhost:5173/>.

## Limitations

To avoid spending too much money on tokens, I have limited the maximum number of tokens (including reasoning tokens) to 5,000 per piece placement. However, LLMs struggle with spatial reasoning to this day and frequently fail to complete reasoning within 5,000 tokens. This leads to a "Model response is not valid JSON" error because the LLM fails to emit any response.

You may remove the line `maxCompletionTokens: 5000` in `apps/api/src/routes/generate.ts` to lift the 5,000-token cap, but beware that you will spend a lot of tokens and the LLM will still play poorly. I am experimenting with scaffolding that makes the LLM play better.
