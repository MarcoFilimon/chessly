import { fastApiBaseUrl, apiFetch } from './utilsAPI.js'
import { getToken } from '../state.js';


export async function getLichessUserInfo(): Promise<any> {
    const response = await apiFetch(`${fastApiBaseUrl}/lichess`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to get user information from Lichess.');
    }
    return await response.json();
}


export async function getOngoingGames(): Promise<any> {
    const response = await apiFetch(`${fastApiBaseUrl}/lichess/ongoing_games`);
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

export async function listenForMoves(gameId: string, onMove: (fen: string) => void) {
    const response = await fetch(`${fastApiBaseUrl}/lichess/stream_moves/${gameId}`);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split('\n');
        buffer = lines.pop()!; // last line may be incomplete
        for (const line of lines) {
            if (!line.trim()) continue;
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;
            const event = JSON.parse(jsonStr);
            if (event.type === 'gameFull' || event.type === 'gameState') {
                onMove(event.state.fen);
            }
        }
    }
}