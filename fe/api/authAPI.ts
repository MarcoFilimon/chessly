import { getToken} from '../state.js';
import { User } from '../types.js';
import {fastApiBaseUrl, apiFetch} from './utilsAPI.js'


export async function login(username: string, password: string): Promise<any> {
    const response = await apiFetch(`${fastApiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password }),
    });
    if (!response.ok) {
        const error = await response.json();
        if (error.detail && Array.isArray(error.detail)) {
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Login failed.');
    }
    return await response.json();
}

export async function register(payload: Partial<User>): Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    if(!response.ok) {
        const error = await response.json();
        if (error.detail && Array.isArray(error.detail)) {
            const messages = error.detail.map((e: any) => e.msg).join('; ');
            throw new Error(messages);
        }
        throw new Error(error.detail || error.message || 'Signup failed.');
    }
    return await response.json();
}

export async function logout(): Promise<void> {
    await apiFetch(`${fastApiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        }
    });
}

export async function sendVerificationEmail() : Promise<void> {
    const response = await apiFetch(`${fastApiBaseUrl}/auth/resend_verification`, {
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
        throw new Error(error.detail || error.message || 'Failed to send verifcation email.');
    }
}