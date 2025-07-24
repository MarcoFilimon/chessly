import { modalMessage, modalOverlay } from "./dom"
import { Tournament, Player} from './types';

export function isTournament(obj: any): obj is Tournament {
    return obj && typeof obj.id === "number" && typeof obj.status === "string";
}

// --- Modal Functions ---
export function showModal(message: string): void {
    modalMessage.textContent = message;
    modalOverlay.classList.add('show');
}

export function closeModal(): void {
    modalOverlay.classList.remove('show');
    modalMessage.textContent = '';
}

export function formatDate(dateStr: string): string {
    // Assumes dateStr is "yyyy-mm-dd"
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
}

export function getSortedPlayers(players: Player[], column: 'name' | 'rating', direction: 'asc' | 'desc'): Player[] {
    return [...players].sort((a, b) => {
        if (column === 'name') {
            return direction === 'asc'
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name);
        } else {
            return direction === 'asc'
                ? a.rating - b.rating
                : b.rating - a.rating;
        }
    });
}
