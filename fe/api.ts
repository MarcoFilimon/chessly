import { setToken, getToken, getRefreshToken} from './state';
import {handleLogout} from './views/home';

// --- FastAPI Configuration ---
export const fastApiBaseUrl: string = 'http://localhost:8000/api/v1';

export async function apiFetch(input: RequestInfo, init: RequestInit = {}, retry = true): Promise<Response> {
    // Attach token if available
    const token = getToken();
    if (token) {
        init.headers = {
            ...(init.headers || {}),
            'Authorization': `Bearer ${token}`,
        };
    }
    let response = await fetch(input, init);

    // If token expired, try to refresh and retry once
    if (response.status === 401 && retry && getRefreshToken()) {
        // Try to refresh token
        const refreshResp = await fetch(`${fastApiBaseUrl}/auth/refresh_token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getRefreshToken()}`,
                'Content-Type': 'application/json'
            }
        });
        if (refreshResp.ok) {
            const data = await refreshResp.json();
            setToken(data.access_token)
            localStorage.setItem('chessTournamentToken', token!);
            // Retry original request with new token
            if (token) {
                init.headers = {
                    ...(init.headers || {}),
                    'Authorization': `Bearer ${token}`,
                };
            }
            response = await fetch(input, init);
        } else {
            // Refresh failed, force logout
            await handleLogout();
            throw new Error("Session expired. Please log in again.");
        }
    }
    return response;
}



export async function createTournament(payload: any): Promise<any> {
    const token = getToken();
    const response = await fetch(`${fastApiBaseUrl}/tournament`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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

export async function fetchTournaments(): Promise<any[]> {
    const response = await apiFetch(`${fastApiBaseUrl}/tournament`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to fetch tournaments');
    }
    return await response.json();
}

export async function fetchTournament(tournamentId: Number): Promise<any> {
    const response = await apiFetch(`${fastApiBaseUrl}/tournament/${tournamentId}`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to fetch tournament.');
    }
    return await response.json();
}

export async function retrievePlayersForTournament(tournamentId: Number): Promise<any> {
    const response = await apiFetch(`${fastApiBaseUrl}/player/${tournamentId}`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to fetch players');
    }
    return await response.json();
}

export async function addPlayerToTournament(payload: any): Promise<any> {
    const token = getToken();
    const { name, rating, tournament_id } = payload;
    const response = await fetch(`${fastApiBaseUrl}/player/${payload.tournament_id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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



export async function deleteTournament(tournamentId: string): Promise<void> {
    const token = getToken();
    const response = await fetch(`${fastApiBaseUrl}/tournament/${tournamentId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to delete tournament.');
    }
}

export async function deletePlayer(playerId: string): Promise<void> {
    const token = getToken();
    const response = await fetch(`${fastApiBaseUrl}/player/${playerId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to delete player.');
    }
}

export async function deleteAllPlayers(currentTournamentId: number): Promise<void> {
    const token = getToken();
    const response = await fetch(`${fastApiBaseUrl}/player/tournament/${currentTournamentId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to delete players.');
    }
}