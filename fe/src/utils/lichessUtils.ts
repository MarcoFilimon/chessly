
export let currentPollingCleanup: (() => void) | undefined = undefined;
export function setCurrentPollingCleanup(fn: (() => void) | undefined) {
    currentPollingCleanup = fn;
}
export function getCurrentPollingCleanup() {
    return currentPollingCleanup;
}