import { getToken} from '../state.js';
import { Player, PlayerUpdate} from '../types.js';
import {fastApiBaseUrl, apiFetch} from './utilsAPI.js'


export async function retrievePlayersForTournament(tournamentId: number): Promise<Player[]> {
    const response = await apiFetch(`${fastApiBaseUrl}/player/${tournamentId}`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to fetch players');
    }
    return await response.json();
}

export async function addPlayerToTournament(payload: Partial<Player>): Promise<Player> {
    const { name, rating, tournament_id } = payload;
    const response = await apiFetch(`${fastApiBaseUrl}/player/${tournament_id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ name, rating })
    });
    if (!response.ok) {
        const error = await response.json();
        // Handle Pydantic validation errors (422)
        if (error.detail && Array.isArray(error.detail)) {
            // Combine all error messages
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Failed to create player.');
    }
    return await response.json();
}


export async function deletePlayer(playerId: string): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/player/${playerId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to delete player.');
    }
}

export async function deleteAllPlayers(currentTournamentId: number): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/player/tournament/${currentTournamentId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to delete players.');
    }
}

export async function updatePlayer(payload: PlayerUpdate, playerId: number): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/player/${playerId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.json();
        if (error.detail && Array.isArray(error.detail)) {
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Failed to update player.');
    }
}