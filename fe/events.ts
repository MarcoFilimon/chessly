import { homeBtn, logoHome, modalCloseBtn } from "./dom";
import { closeModal } from "./utils";
import { setCurrentView } from "./state";
import { renderApp } from "./views/home";

export function attachGlobalEvents() {
    homeBtn.addEventListener('click', () => {
        setCurrentView('home');
        renderApp();
    });
    logoHome.addEventListener('click', () => {
        setCurrentView('home');
        renderApp();
    });
    modalCloseBtn.addEventListener('click', closeModal);
}