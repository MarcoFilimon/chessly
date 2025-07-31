import { appContent } from "../dom.js";
import { getLichessUserInfo, getOngoingGames, makeMove, sendChallenge} from '../api/lichessAPI.js'
import { Modal } from "../utils/general.js";

import { setCurrentView } from '../state.js';
import { renderApp } from '../views/home.js';


const whiteSquareGrey = '#a9a9a9'
const blackSquareGrey = '#696969'

declare global {
    interface Window {
        Chessboard: any;
    }
}

import { Chess } from 'chess.js';


let currentPollingCleanup: (() => void) | undefined = undefined;
export function setCurrentPollingCleanup(fn: (() => void) | undefined) {
    currentPollingCleanup = fn;
}
export function getCurrentPollingCleanup() {
    return currentPollingCleanup;
}

export async function renderLichess() {
    if (currentPollingCleanup) currentPollingCleanup();
    appContent.innerHTML = `
        <div class="p-8 max-w-xl mx-auto bg-white rounded-lg shadow-lg flex flex-col items-center justify-center">
            <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-opacity-50 mb-4"></div>
            <span class="text-lg text-gray-600">Loading Lichess profile...</span>
        </div>
    `;
    try {
        const profile = await getLichessUserInfo();

        appContent.innerHTML = `
            <div class="p-8 max-w-xl mx-auto bg-white rounded-lg shadow-lg">
                <h2 class="text-2xl font-bold mb-6 text-center">Lichess Profile</h2>
                <div class="space-y-4 mb-8">
                    <div>
                        <span class="font-semibold">Username:</span>
                        <a href="${profile.data.url}" target="_blank" class="text-blue-600 underline">${profile.data.username}</a>
                    </div>
                    <div>
                        <span class="font-semibold">Created At:</span>
                        ${profile.data.createdAt ? new Date(profile.data.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                    <div>
                        <table class="min-w-full divide-y divide-gray-200 table-fixed">
                            <thead>
                                <tr class="bg-gray-100">
                                    <th colspan="4" class="px-4 py-2 text-center text-sm font-bold text-gray-700 uppercase border-b">Ratings</th>
                                </tr>
                                <tr>
                                    <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Bullet</th>
                                    <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Blitz</th>
                                    <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Rapid</th>
                                    <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Classical</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="font-semibold text-center">${profile.data.perfs?.bullet?.rating ?? 'N/A'}</td>
                                    <td class="font-semibold text-center">${profile.data.perfs?.blitz?.rating ?? 'N/A'}</td>
                                    <td class="font-semibold text-center">${profile.data.perfs?.rapid?.rating ?? 'N/A'}</td>
                                    <td class="font-semibold text-center">${profile.data.perfs?.classical?.rating ?? 'N/A'}</td>
                                </tr>
                                <tr class="bg-gray-100">
                                    <th colspan="4" class="px-4 py-2 text-center text-sm font-bold text-gray-700 uppercase border-b">Stats</th>
                                </tr>
                                <tr>
                                    <td class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Matches</td>
                                    <td class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Wins</td>
                                    <td class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Loses</td>
                                    <td class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Draws</td>
                                </tr>
                                <tr>
                                    <td class="font-semibold text-center">${profile.data.count?.all ?? 'N/A'}</td>
                                    <td class="font-semibold text-center">${profile.data.count?.win ?? 'N/A'}</td>
                                    <td class="font-semibold text-center">${profile.data.count?.loss ?? 'N/A'}</td>
                                    <td class="font-semibold text-center">${profile.data.count?.draw ?? 'N/A'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <h2 class="text-2xl font-bold mb-2 text-center">Challenge another player</h2>
                <form id="challengePlayer" class="space-y-3 mb-8">
                    <div>
                        <label class="block text-gray-700 font-semibold mb-1" for="challengePlayerInput">Name</label>
                        <input id="challengePlayerInput" type="text" class="w-full px-3 py-2 border rounded" placeholder="Enter username" required>
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow">
                            Challenge
                        </button>
                    </div>
                </form>

                <div id="lichessGamesSection">
                    <h3 class="text-xl font-bold mb-2">Ongoing Games</h3>
                    <div id="lichessGamesList" class="space-y-2"></div>
                </div>
            </div>
        `;

    // Initial render of games
    await renderOngoingGames();

    document.getElementById("challengePlayer")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = (document.getElementById("challengePlayerInput") as HTMLInputElement).value.trim();
        try {
            await sendChallenge(username);
            Modal.show("Challenge sent succesfully!");
        } catch (error: any) {
            Modal.show("Failed to send challenge: " + error.message);
        }
    });

    } catch (error: any) {
        Modal.show("Lichess error: " + error.message);
        setCurrentView('viewUser');
        renderApp();
    }
}

async function renderOngoingGames() {
    const gamesListDiv = document.getElementById('lichessGamesList');
    if (!gamesListDiv) return;
    gamesListDiv.innerHTML = `<div class="text-gray-500">Loading games...</div>`;
    try {
        const result = await getOngoingGames();
        if (!result.data.nowPlaying || result.data.nowPlaying.length === 0) {
            gamesListDiv.innerHTML = `<div class="text-gray-500">No ongoing games.</div>`;
            return;
        }
        const games = result.data.nowPlaying;
        gamesListDiv.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Opponent</th>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Rating</th>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Playing as</th>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Game Link</th>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Go Play</th>
                    </tr>
                </thead>
                <tbody>
                    ${games.map((lichessGame: any) => {
                        const opponent = lichessGame.opponent;
                        const opponentName = opponent.username;
                        const opponentRating = opponent.rating;
                        const opponentProfile = `https://lichess.org/@/${opponentName}`;
                        return `
                            <tr class="bg-white border-b">
                                <td class="font-semibold text-center">
                                    <a href="${opponentProfile}" target="_blank" class="text-blue-600 underline">
                                        ${opponentName}
                                    </a>
                                </td>
                                <td class="font-semibold text-center">${opponentRating}</td>
                                <td class="font-semibold text-center">${lichessGame.color}</td>
                                <td class="font-semibold text-center">
                                    <a href="https://lichess.org/${lichessGame.fullId}" target="_blank" class="text-blue-600 underline">View</a>
                                </td>
                                <td class="font-semibold text-center">
                                    <button type="button" class="go-play-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded" data-game-id="${lichessGame.fullId}">
                                        Go Play
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        // Attach event listeners for "Go Play" buttons
        document.querySelectorAll('.go-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameId = (e.currentTarget as HTMLElement).getAttribute('data-game-id');
                const game = games.find((g: any) => g.fullId === gameId);
                if (game) {
                    renderGameBoard(game);
                }
            });
        });
    } catch (error: any) {
        gamesListDiv.innerHTML = `<div class="text-red-600">Failed to load games: ${error.message}</div>`;
    }
}

function updateStatus(game: any) {
    let status = ''
    let moveColor = 'White'
    if (game.turn() === 'b')
        moveColor = 'Black'
    // checkmate?
    if (game.isCheckmate()) {
        status = 'Game over, ' + moveColor + ' is in checkmate.';
        Modal.show(status);
    }
    // draw?
    else if (game.isDraw()) {
        Modal.show('Game over, drawn position.');
    }
    else { // game still on
        status = moveColor + ' to move'
        // check?
        if (game.inCheck())
            status += ', ' + moveColor + ' is in check.'
    }
    // Show status in the UI
    const statusDiv = document.getElementById('game-status');
    if (statusDiv) statusDiv.textContent = status;
}

function renderContent(lichessGame: any) {
    appContent.innerHTML = `
        <div class="max-w-xl mx-auto bg-white rounded-lg shadow-lg p-6 flex flex-col items-center gap-4">
            <div class="w-full flex justify-between items-center mb-2">
                <button id="backToGamesBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-4 rounded">
                    ← Back to Games
                </button>
                <span class="text-sm text-gray-500">Game ID: <span class="font-mono">${lichessGame.fullId}</span></span>
            </div>
            <h2 class="text-2xl font-bold text-center mb-2">
                Game vs
                <a href="https://lichess.org/@/${lichessGame.opponent.username}" target="_blank" class="text-blue-600 underline ml-1">
                    ${lichessGame.opponent.username}
                </a>
            </h2>
            <div class="flex flex-col items-center gap-2 w-full">
                <div id="board-${lichessGame.fullId}" class="mx-auto" style="width: 400px"></div>
                <div id="game-status" class="text-lg text-center text-gray-700 font-semibold min-h-[2rem]"></div>
            </div>
            <div class="w-full flex justify-between mt-2 text-sm text-gray-600">
                <span>Playing as: <span class="font-bold capitalize">${lichessGame.color}</span></span>
                <a href="https://lichess.org/${lichessGame.fullId}" target="_blank" class="text-blue-600 underline">Open on Lichess</a>
            </div>
        </div>
    `;
}

function startPollingForMoves(lichessGame: any, game: any, board: any) {
    let lastMove = lichessGame.lastMove;
    let polling = true;

    async function poll() {
        if (!polling) return;
        try {
            const result = await getOngoingGames();
            const updatedGame = result.data.nowPlaying.find((g: any) => g.fullId === lichessGame.fullId);
            if (updatedGame && updatedGame.lastMove !== lastMove) {
                lastMove = updatedGame.lastMove;
                // Update the chess.js game and board
                game.load(updatedGame.fen || 'start');
                board.position(game.fen());
                updateStatus(game);
            }
        } catch (e) {
            console.warn("Polling error:", e);
        }
        if (polling) setTimeout(poll, 1000);
    }

    poll();

    // Return a cleanup function to stop polling
    return () => { polling = false; };
}

function removeGreySquares() {
    // Remove background from all squares
    document.querySelectorAll('.square-55d63').forEach(square => {
        (square as HTMLElement).style.background = '';
    });
}

function greySquare(square: string) {
    const squareEl = document.querySelector('.square-' + square) as HTMLElement | null;
    if (!squareEl) return;
    let background = whiteSquareGrey;
    if (squareEl.classList.contains('black-3c85d')) { // all black squares have black-3c85d as a class
        background = blackSquareGrey;
    }
    squareEl.style.background = background;
}

function renderGameBoard(lichessGame: any) {
    // Stop any previous polling before starting a new one
    if (currentPollingCleanup) currentPollingCleanup();
    renderContent(lichessGame);
    try {
        const game = new Chess(lichessGame.fen || 'start');
        updateStatus(game);
        const board = window.Chessboard(`board-${lichessGame.fullId}`, {
            position: game.fen(),
            orientation: lichessGame.color,
            draggable: true,
            async onDrop(source: string, target: string) {
                removeGreySquares();
                const move = game.move({ from: source, to: target, promotion: 'q' });
                if (move === null) return 'snapback';
                await makeMove(lichessGame.fullId, source, target);
                updateStatus(game);
                board.position(game.fen()); // Update board after valid move
            },
            onDragStart(source: string, piece: string, position: string, orientation: string) {
                console.log(source, piece, position, orientation)
                if (game.isGameOver()) return false;
                // only pick up your pieces.
                const turnColor = lichessGame.color.charAt(0); // 'w' or 'b'
                const pieceColor = piece.charAt(0); // 'w' or 'b'
                if ((turnColor === 'w' && pieceColor === 'b') ||
                    (turnColor === 'b' && pieceColor === 'w')) {
                    console.log(`It's ${turnColor}'s turn, but you are trying to drag a ${pieceColor} piece. Preventing drag.`);
                    return false;
                }
                return true;
            },
            // update the board position after the piece snap
            // for castling, en passant, pawn promotion
            onSnapEnd() {
                updateStatus(game);
                board.position(game.fen());
            },
            onMouseoverSquare(square: string) {
                // get list of possible moves for this square
                const moves = game.moves({ square: square as any, verbose: true });

                // exit if there are no moves available for this square
                if (moves.length === 0) return;

                // highlight the current piece's square
                greySquare(square);

                // highlight the possible squares for this piece
                for (const move of moves) {
                    greySquare(move.to);
                }
            },
            onMouseoutSquare() {
                removeGreySquares();
            }
        });
        setCurrentPollingCleanup(startPollingForMoves(lichessGame, game, board));
        console.log(`Chessboard initialized for game ${lichessGame.fullId}`);
    } catch (error) {
        console.error("Error initializing Chessboard:", error);
        Modal.show("Failed to load chess board. Please check console for details.");
    }

    document.getElementById('backToGamesBtn')?.addEventListener('click', async () => {
        if (currentPollingCleanup) currentPollingCleanup();
        await renderLichess();
    });
}