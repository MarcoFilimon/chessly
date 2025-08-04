import { fastApiBaseUrl, apiFetch } from './utilsAPI.js'
import { getToken } from '../state.js';

import { Chess } from 'chess.js'; // Make sure you have chess.js imported

export async function getLichessUserInfo(): Promise<any> {
    const response = await apiFetch(`${fastApiBaseUrl}/lichess/`, {
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to get user information from Lichess.');
    }
    return await response.json();
}


export async function getOngoingGames(): Promise<any> {
    const response = await apiFetch(`${fastApiBaseUrl}/lichess/ongoing_games`, {
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to get ongoing games.');
    }
    return await response.json();
}


export async function makeMove(gameId: string, source: string, target: string): Promise<void> {
    const move = source + target
    const response = await apiFetch(`${fastApiBaseUrl}/lichess/make_move`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({gameId, move})
    });
    if (!response.ok) {
        const error = await response.json();
        // Handle Pydantic validation errors (422)
        if (error.detail && Array.isArray(error.detail)) {
            // Combine all error messages
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Failed to send the move.');
    }
}


export async function resignGame(gameId: string): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/lichess/resign/${gameId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        // Handle Pydantic validation errors (422)
        if (error.detail && Array.isArray(error.detail)) {
            // Combine all error messages
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Failed to resign the game.');
    }
}


export async function drawGame(gameId: string): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/lichess/draw/${gameId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        // Handle Pydantic validation errors (422)
        if (error.detail && Array.isArray(error.detail)) {
            // Combine all error messages
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Failed to draw the game.');
    }
}

export async function getChallenges(): Promise<any> {
    const response = await apiFetch(`${fastApiBaseUrl}/lichess/challenges`, {
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to get challenges.');
    }
    return await response.json();
}


export async function acceptChallenge(challengeId: string): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/lichess/challenge/accept/${challengeId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        // Handle Pydantic validation errors (422)
        if (error.detail && Array.isArray(error.detail)) {
            // Combine all error messages
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Failed to accept the challenge.');
    }
}


export async function declineChallenge(challengeId: string): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/lichess/challenge/decline/${challengeId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        // Handle Pydantic validation errors (422)
        if (error.detail && Array.isArray(error.detail)) {
            // Combine all error messages
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Failed to decline the challenge.');
    }
}

export async function cancelChallenge(challengeId: string): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/lichess/challenge/cancel/${challengeId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        // Handle Pydantic validation errors (422)
        if (error.detail && Array.isArray(error.detail)) {
            // Combine all error messages
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Failed to cancel the challenge.');
    }
}


export async function createChallenge(username: string): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/lichess/challenge/create/${username}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        // Handle Pydantic validation errors (422)
        if (error.detail && Array.isArray(error.detail)) {
            // Combine all error messages
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Failed to create the challenge.');
    }
}


export async function challengeAI(): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/lichess/challenge/AI`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        // Handle Pydantic validation errors (422)
        if (error.detail && Array.isArray(error.detail)) {
            // Combine all error messages
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Failed to challenge the LichessAI.');
    }
}

export function listenForMoves(gameId: string, onMove: (fen: string, status?: string, winner?: string) => void): () => void {
    // console.log("Opening SSE for game:", gameId);
    const token = getToken();
    const url = `${fastApiBaseUrl}/lichess/stream_moves/${gameId}?token=${encodeURIComponent(token!)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
        // console.log("SSE event received:", event.data);
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'gameFull') {
                onMove(data.state.fen, data.state.status, data.state.winner);
            } else if (data.type === 'gameState') {
                let fen = undefined;
                if (data.fen) {
                    fen = data.fen;
                } else if (data.moves) {
                    const chess = new Chess();
                    for (const move of data.moves.split(' ')) {
                        if (move) chess.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
                    }
                    fen = chess.fen();
                }
                onMove(fen, data.status, data.winner);
            }
        } catch (e) {
            console.warn("Failed to parse SSE event:", event.data);
        }
    };

    eventSource.onerror = () => {
        eventSource.close();
    };

    // Return a cleanup function to close the connection
    return () => eventSource.close();
}