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


export async function makeMove(gameId: string, move: string): Promise<void> {
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