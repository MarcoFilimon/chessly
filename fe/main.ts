import {renderApp} from './views/home'
import { attachGlobalEvents } from './events';

window.onload = function() {
    renderApp();
    attachGlobalEvents();
};