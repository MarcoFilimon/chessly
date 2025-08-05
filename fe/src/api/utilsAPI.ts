import { setToken, getRefreshToken} from '../state.js';
import { handleLogout } from '../views/home.js';

export const fastApiBaseUrl: string = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(input: RequestInfo, init: RequestInit = {}, retry = true): Promise<Response> {
    let response = await fetch(input, init);

    // If token expired, try to refresh it and retry the operation.
    if (response.status === 401 && retry && getRefreshToken()) {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            await handleLogout();
            throw new Error("No refresh token. Please log in again.");
        }

        const refreshResp = await fetch(`${fastApiBaseUrl}/auth/refresh_token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (refreshResp.ok) {
            const data = await refreshResp.json();
            setToken(data.access_token);
            localStorage.setItem('chessTournamentToken', data.access_token);

            // Merge new Authorization header with any existing headers
            const newHeaders = {
                ...(init.headers || {}),
                'Authorization': `Bearer ${data.access_token}`,
            };

            // Retry original request with new token
            response = await fetch(input, { ...init, headers: newHeaders });
        } else {
            // Refresh failed, force logout and break the loop
            await handleLogout();
            throw new Error("Session expired. Please log in again.");
        }
    }

    return response;
}