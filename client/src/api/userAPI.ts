import { getToken, getUserId} from '../state.js';
import { type UserUpdate, type User } from '../types.js';
import {fastApiBaseUrl, apiFetch} from './utilsAPI.js'


export async function fetchProfile() : Promise<User> {
    const response = await apiFetch(`${fastApiBaseUrl}/auth/me`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Failed to user information.');
    }
    return await response.json();
}

export async function updateProfile(newUserData: UserUpdate) : Promise<User> {
    const response = await apiFetch(`${fastApiBaseUrl}/auth/${getUserId()}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(newUserData)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || "Failed to update profile.");
    }
    return await response.json();
}