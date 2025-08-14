import { setToken } from '../state.js';
import { handleLogout } from '../views/home.js';

export const fastApiBaseUrl: string = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(input: RequestInfo, init: RequestInit = {}, retry = true): Promise<Response> {
    let response = await fetch(input, init);

    // If token expired, try to refresh it and retry the operation.
    if (response.status === 401 && retry) {
        const refreshResp = await fetch(`${fastApiBaseUrl}/auth/refresh_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
            // No need to send refresh token manually!
        });

        if (refreshResp.ok) {
            const data = await refreshResp.json();
            setToken(data.access_token);
            // Retry original request with new token
            response = await fetch(input, init);
        } else {
            // Refresh failed, force logout and break the loop
            await handleLogout();
            throw new Error("Session expired. Please log in again.");
        }
    }

    return response;
}