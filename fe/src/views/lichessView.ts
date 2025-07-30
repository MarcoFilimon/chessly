import { appContent } from "../dom.js";
import { getLichessUserInfo, getOngoingGames, makeMove} from '../api/lichessAPI.js'
import { Modal } from "../utils/general.js";

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
                        <span class="font-semibold">Blitz Rating:</span>
                        ${profile.data.perfs?.blitz?.rating ?? 'N/A'}
                    </div>
                </div>
                <div id="lichessGamesSection">
                    <h3 class="text-xl font-bold mb-2">Ongoing Games</h3>
                    <div id="lichessGamesList" class="space-y-2"></div>
                </div>
            </div>
        `;

    // Initial render of games
    await renderOngoingGames();

    // // Clear previous interval if any
    // if (gamesInterval) clearInterval(gamesInterval);

    // // Auto-refresh ongoing games every 10 seconds
    // gamesInterval = window.setInterval(renderOngoingGames, 10000);
    } catch (error: any) {
        Modal.show("Lichess error: " + error.message);
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
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opponent</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Playing as</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Game Link</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Go Play</th>
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
                                <td class="px-4 py-2">
                                    <a href="${opponentProfile}" target="_blank" class="text-blue-600 underline">
                                        ${opponentName}
                                    </a>
                                </td>
                                <td class="px-4 py-2">${opponentRating}</td>
                                <td class="px-4 py-2">${lichessGame.color}</td>
                                <td class="px-4 py-2">
                                    <a href="https://lichess.org/${lichessGame.fullId}" target="_blank" class="text-blue-600 underline">View</a>
                                </td>
                                <td class="px-4 py-2">
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
        <div class="max-w-xl mx-auto bg-white rounded-lg shadow-lg p-6">
            <button id="backToGamesBtn" class="mb-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-4 rounded">
                ← Back to Games
            </button>
            <h2 class="text-2xl font-bold mb-4 text-center">Game vs
                <a href="https://lichess.org/@/${lichessGame.opponent.username}" target="_blank" class="text-blue-600 underline">
                    ${lichessGame.opponent.username}
                </a>
            </h2>
            <div id="board-${lichessGame.fullId}" style="width: 400px"></div>
            <!-- <span class="ml-4"><a href="https://lichess.org/${lichessGame.fullId}" target="_blank" class="text-blue-600 underline">${lichessGame.fullId}</a></span> -->
            <div id="game-status"></div>
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
            onMouseoverSquare(square: string, piece: string) {
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
            onMouseoutSquare(square: string, piece: string) {
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