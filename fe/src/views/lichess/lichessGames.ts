
import { Chess } from 'chess.js';

import { Modal } from "../../utils/general.js";

import { setCurrentView } from '../../state.js';
// import { renderApp } from '../home.js';

import {
    getOngoingGames,
    makeMove,
    resignGame,
    drawGame,
    listenForMoves,
} from '../../api/lichessAPI.js'

import { setCurrentPollingCleanup, currentPollingCleanup } from '../../utils/lichessUtils.js';

import { renderLichess } from './lichess.js'

import { appContent } from "../../dom.js";

const whiteSquareGrey = '#a9a9a9'
const blackSquareGrey = '#696969'

declare global {
    interface Window {
        Chessboard: any;
    }
}

export async function renderOngoingGames() {
    // const tab = (window as any).lichessTab;
    const container = document.getElementById('lichessTabContent');
    if (!container) return;
    let content = `
        <div id="lichessGamesSection">
            <h3 class="text-xl font-bold mb-2">Ongoing Games</h3>
            <div id="lichessGamesList" class="space-y-2"></div>
        </div>
    `;
    container.innerHTML = content;

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
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Game Link</th>
                        <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase"></th>
                    </tr>
                </thead>
                <tbody>
                    ${games.map((lichessGame: any) => {
                        const opponent = lichessGame.opponent;
                        const opponentName = opponent.username;
                        const opponentRating = opponent.rating ?? 'N/A';
                        const opponentProfile = `https://lichess.org/@/${opponentName}`;
                        return `
                            <tr class="bg-white border-b">
                                <td class="font-semibold text-center">
                                    <a href="${opponentProfile}" target="_blank" class="text-blue-600 underline">
                                        ${opponentName}
                                    </a>
                                </td>
                                <td class="font-semibold text-center">${opponentRating}</td>
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
        {
            const locationArray = game.findPiece({ type: 'k', color: moveColor.charAt(0).toLowerCase() });
            status += ', ' + moveColor + ' is in check.'
            if (locationArray) {
                redSquare(locationArray[0]);
            }
        }
    }
    // Show status in the UI
    const statusDiv = document.getElementById('game-status');
    if (statusDiv) statusDiv.textContent = status;
}

function renderGameContent(lichessGame: any) {
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
                <div class="flex gap-4 mt-2">
                    <button id="resignBtn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow">
                        Resign
                    </button>
                    <button id="drawBtn" class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded shadow">
                        Offer Draw
                    </button>
                </div>
            </div>
            <div class="w-full flex justify-between mt-2 text-sm text-gray-600">
                <span>Playing as: <span class="font-bold capitalize">${lichessGame.color}</span></span>
                <a href="https://lichess.org/${lichessGame.fullId}" target="_blank" class="text-blue-600 underline">Open on Lichess</a>
            </div>
        </div>
    `;

        // Add event listeners for resign and draw buttons
    document.getElementById('resignBtn')?.addEventListener('click', async () => {
        try {
            if (!confirm('Are you sure you want to resign the game?')) return;
            await resignGame(lichessGame.fullId);
            Modal.show("You resigned the game.");
            renderLichess();
        } catch (error: any) {
            Modal.show("Failed to resign: " + error.message);
        }
    });

    document.getElementById('drawBtn')?.addEventListener('click', async () => {
        try {
            if (!confirm('Are you sure you want to draw the game?')) return;
            await drawGame(lichessGame.fullId);
        } catch (error: any) {
            Modal.show("Failed to offer draw: " + error.message);
        }
    });
}

function startListeningForMoves(lichessGame: any, game: any, board: any) {
    let cleanup = listenForMoves(lichessGame.fullId, (fen: string, status?: string, winner?: string) => {
        game.load(fen || 'start');
        board.position(game.fen());
        updateStatus(game);

        // Handle resignation or other game end statuses
        if (status && ["mate", "resign", "draw", "stalemate", "timeout", "outoftime", "aborted"].includes(status)) {
            if (currentPollingCleanup) currentPollingCleanup();
            setCurrentView('viewLichess');
            if (status === "draw" || status === "stalemate") {
                Modal.show("Game ended in a draw.");
            } else if (status === "resign") {
                Modal.show(`Game ended by resignation. Winner: ${winner || "unknown"}`);
            } else if (status === "mate") {
                Modal.show(`Checkmate! Winner: ${winner || "unknown"}`);
            } else {
                Modal.show(`Game ended: ${status}`);
            }
            // renderApp();
        }
    });

    return cleanup;
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

function redSquare(squareLocation: string) {
    const squareEl = document.querySelector(`.square-55d63[data-square="${squareLocation}"]`) as HTMLElement | null;
    if (!squareEl) return;
    squareEl.style.background = '#ff4d4d';
}

function renderGameBoard(lichessGame: any) {
    // Stop any previous polling before starting a new one
    if (currentPollingCleanup) currentPollingCleanup();
    renderGameContent(lichessGame);
    try {
        const game = new Chess(lichessGame.fen || 'start');
        const board = window.Chessboard(`board-${lichessGame.fullId}`, {
            position: game.fen(),
            orientation: lichessGame.color,
            draggable: true,
            pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
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
                // Re-highlight king's square if in check
                if (game.inCheck()) {
                    const locationArray = game.findPiece({ type: 'k', color: game.turn() });
                    if (locationArray) {
                        redSquare(locationArray[0]);
                    }
                }
            }
        });
        updateStatus(game);
        startListeningForMoves(lichessGame, game, board).then(cleanup => {
            setCurrentPollingCleanup(cleanup);
        });
        // console.log(`Chessboard initialized for game ${lichessGame.fullId}`);
    } catch (error) {
        console.error("Error initializing Chessboard:", error);
        Modal.show("Failed to load chess board. Please check console for details.");
    }

    document.getElementById('backToGamesBtn')?.addEventListener('click', async () => {
        if (currentPollingCleanup) currentPollingCleanup();
        await renderLichess();
    });
}