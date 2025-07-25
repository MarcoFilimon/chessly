import { modalMessage, modalOverlay } from "../dom"

export const Modal = {
    show(message: string): void {
        modalMessage.textContent = message;
        modalOverlay.classList.add('show');
    },
    close(): void {
        modalOverlay.classList.remove('show');
        modalMessage.textContent = '';
    }
};

export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
}

