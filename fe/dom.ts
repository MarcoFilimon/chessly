function getElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing #${id} element in DOM`);
    return el as T;
}

export const appContent = getElement<HTMLElement>('app-content');
export const authButtonsContainer = getElement<HTMLElement>('authButtons');
export const homeBtn = getElement<HTMLButtonElement>('homeBtn');
export const logoHome = getElement<HTMLElement>('logoHome');
export const modalOverlay = getElement<HTMLElement>('modalOverlay');
export const modalMessage = getElement<HTMLElement>('modalMessage');
export const modalCloseBtn = getElement<HTMLButtonElement>('modalCloseBtn');