import { modalMessage, modalOverlay } from "../dom.js"

export const Modal = {
    show(message: string, options?: { spinner?: boolean }): void {
        if (options?.spinner) {
            modalMessage.innerHTML = `
                <div class="spinner" style="margin-bottom: 1rem;"></div>
                <div>${message}</div>
            `;
        } else {
            modalMessage.textContent = message;
        }
        modalOverlay.classList.add('show');
    },
    close(): void {
        modalOverlay.classList.remove('show');
        modalMessage.textContent = '';
        modalMessage.innerHTML = '';
    }
};

export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
}

