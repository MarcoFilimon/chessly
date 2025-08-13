import { getToken, getSelectedRoundIdx} from '../state.js';
import { type Tournament, type MatchupResult} from '../types.js';
import {fastApiBaseUrl, apiFetch} from './utilsAPI.js'


export async function createTournament(payload: Partial<Tournament>): Promise<Tournament> {
    const response = await apiFetch(`${fastApiBaseUrl}/tournament`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json();
        // Handle Pydantic validation errors (422)
        if (error.detail && Array.isArray(error.detail)) {
            // Combine all error messages
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Failed to create tournament.');
    }
    return await response.json();
}

export async function fetchTournaments(statusFilter: string): Promise<Tournament[]> {
    const url = new URL(`${fastApiBaseUrl}/tournament`);
    if (statusFilter) {
        url.searchParams.append('status', statusFilter);
    }
    const response = await apiFetch(url.toString(), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to fetch tournaments');
    }
    return await response.json();
}

export async function fetchTournament(tournamentId: number): Promise<Tournament> {
    const response = await apiFetch(`${fastApiBaseUrl}/tournament/${tournamentId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to fetch tournament.');
    }
    return await response.json();
}


export async function deleteTournament(tournamentId: string, statusTournament: string): Promise<void> {
    const url = new URL(`${fastApiBaseUrl}/tournament/${tournamentId}`)
    if (statusTournament) {
        url.searchParams.append('status', statusTournament);
    }
    const response = await apiFetch(url.toString(), {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to delete tournament.');
    }
}


export async function batchUpdatePlayerResults(currentTournamentId: number, results: MatchupResult[]): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournamentId}/round_result/${getSelectedRoundIdx() + 1}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ results })
    });
    if (!response.ok) {
        const error = await response.json();
        console.error(error);
        throw new Error(error.detail || error.message || 'Failed to save results.');
    }
}

export async function startTournament(currentTournamentId: number): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournamentId}/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to start tournament.');
    }
    return await response.json();
}


export async function endTournament(currentTournament: Tournament, statusTournament?: string): Promise<void> {
    const url = new URL(`${fastApiBaseUrl}/tournament/${currentTournament.id}/end`)
    if (statusTournament) {
        url.searchParams.append('status', statusTournament);
    }
    const response = await apiFetch(url.toString(), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to end the tournament.');
    }
}

export async function updateTournament(currentTournament: Tournament): Promise<void> {
    const url = new URL(`${fastApiBaseUrl}/tournament/${currentTournament.id}`)
    const response = await apiFetch(url.toString(), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(currentTournament)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to update the tournament.');
    }
}


export async function generatePlayers(currentTournamentId: number): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/tournament/${currentTournamentId}/generate_players`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to generate players.');
    }
}


export async function fetchTournamentCounts(): Promise<{ [status: string]: number }> {
    const url = new URL(`${fastApiBaseUrl}/tournament/counts`);
    const response = await apiFetch(url.toString(), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
    });
    if (!response.ok) throw new Error('Failed to fetch tournament counts');
    return await response.json();
}