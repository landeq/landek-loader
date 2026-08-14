// ==UserScript==
// @name         Landek - prywatny loader
// @namespace    https://github.com/landeq/landek-loader
// @version      1.0.0
// @description  Ładuje najnowszą wersję Menedżera Ataków z prywatnego repozytorium GitHub przy każdym odświeżeniu strony.
// @homepageURL  https://github.com/landeq/landek-loader
// @supportURL   https://github.com/landeq/landek-loader/issues
// @downloadURL  https://landeq.github.io/landek-loader/landek.user.js
// @updateURL    https://landeq.github.io/landek-loader/landek.user.js
// @match        *://*.plemiona.pl/game.php*
// @run-at       document-idle
// @connect      api.github.com
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = Object.freeze({
        owner: 'landeq',
        repository: 'landek-menedzer-atakow',
        branch: 'main',
        path: 'landek.user.js',
        apiVersion: '2022-11-28'
    });

    const STORAGE = Object.freeze({
        token: 'landek_loader_github_token_v1',
        cachedSource: 'landek_loader_cached_source_v1',
        cachedAt: 'landek_loader_cached_at_v1'
    });

    function apiUrl() {
        const path = CONFIG.path.split('/').map(encodeURIComponent).join('/');
        return `https://api.github.com/repos/${encodeURIComponent(CONFIG.owner)}/${encodeURIComponent(CONFIG.repository)}/contents/${path}?ref=${encodeURIComponent(CONFIG.branch)}&_=${Date.now()}`;
    }

    function showMessage(message, error = false) {
        const text = `[Landek loader] ${message}`;
        (error ? console.error : console.info)(text);

        const oldBanner = document.getElementById('landek-loader-message');
        if (oldBanner) oldBanner.remove();

        const banner = document.createElement('div');
        banner.id = 'landek-loader-message';
        banner.textContent = message;
        banner.style.cssText = [
            'position:fixed',
            'z-index:2147483647',
            'top:12px',
            'left:50%',
            'transform:translateX(-50%)',
            'max-width:min(680px,calc(100vw - 24px))',
            'padding:10px 14px',
            'border:1px solid ' + (error ? '#b94a48' : '#94712f'),
            'border-radius:8px',
            'background:' + (error ? '#4b2020' : '#252018'),
            'color:#fff',
            'font:600 13px/1.4 Arial,sans-serif',
            'box-shadow:0 8px 28px #0009'
        ].join(';');
        (document.body || document.documentElement).appendChild(banner);
    }

    function tokenInstructions() {
        return [
            'Wklej token GitHub typu fine-grained.',
            '',
            'Token powinien mieć dostęp tylko do repozytorium:',
            `${CONFIG.owner}/${CONFIG.repository}`,
            'oraz uprawnienie Contents: Read-only.',
            '',
            'Token zostanie zapisany wyłącznie lokalnie w pamięci Tampermonkey.'
        ].join('\n');
    }

    function configureToken() {
        const entered = unsafeWindow.prompt(tokenInstructions(), '');
        if (entered === null) return false;

        const token = entered.trim();
        if (!token) {
            showMessage('Nie zapisano pustego tokenu. Użyj menu Tampermonkey „Landek: ustaw token GitHub”.', true);
            return false;
        }

        GM_setValue(STORAGE.token, token);
        showMessage('Token zapisany lokalnie. Odświeżam stronę i pobieram prywatny skrypt.');
        unsafeWindow.location.reload();
        return true;
    }

    function removeToken() {
        if (!unsafeWindow.confirm('Usunąć lokalny token GitHub i zapisaną kopię awaryjną Landka?')) return;
        GM_deleteValue(STORAGE.token);
        GM_deleteValue(STORAGE.cachedSource);
        GM_deleteValue(STORAGE.cachedAt);
        showMessage('Usunięto token i lokalną kopię skryptu.');
    }

    function requestCore(token) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: apiUrl(),
                headers: {
                    Accept: 'application/vnd.github.raw+json',
                    Authorization: `Bearer ${token}`,
                    'Cache-Control': 'no-cache',
                    'X-GitHub-Api-Version': CONFIG.apiVersion
                },
                timeout: 20000,
                onload(response) {
                    if (response.status === 200) {
                        resolve(response.responseText);
                        return;
                    }

                    const error = new Error(`GitHub API zwrócił HTTP ${response.status}.`);
                    error.status = response.status;
                    reject(error);
                },
                ontimeout() {
                    reject(new Error('Przekroczono czas oczekiwania na prywatny skrypt.'));
                },
                onerror() {
                    reject(new Error('Nie udało się połączyć z GitHub API.'));
                }
            });
        });
    }

    function validateCore(source) {
        if (typeof source !== 'string' || source.length < 1000) {
            throw new Error('Pobrany plik jest pusty albo niekompletny.');
        }
        if (!source.includes('// ==UserScript==') || !source.includes('// ==/UserScript==')) {
            throw new Error('Pobrany plik nie jest userscriptem.');
        }
        if (!source.includes('landek-manager')) {
            throw new Error('Pobrany plik nie wygląda jak Menedżer Ataków Landek.');
        }
        return source;
    }

    function executeCore(source) {
        // Rdzeń był tworzony jako userscript @grant none i korzysta z globali strony
        // (np. game_data, TribalWars i UI). `with(pageWindow)` zachowuje ten kontekst,
        // mimo że sam loader potrzebuje uprawnień GM do prywatnego zapytania GitHub.
        const runner = new Function(
            'pageWindow',
            `with (pageWindow) {\n${source}\n}\n//# sourceURL=landek-private-core.user.js`
        );
        runner(unsafeWindow);
    }

    function cachedSource() {
        const source = String(GM_getValue(STORAGE.cachedSource, '') || '');
        return source ? validateCore(source) : '';
    }

    function canUseCache(error) {
        return !Number.isFinite(error?.status) || error.status === 0 || error.status === 403 || error.status === 429 || error.status >= 500;
    }

    async function main() {
        GM_registerMenuCommand('Landek: ustaw lub zmień token GitHub', configureToken);
        GM_registerMenuCommand('Landek: usuń token i cache', removeToken);

        const token = String(GM_getValue(STORAGE.token, '') || '').trim();
        if (!token) {
            showMessage('Brak tokenu GitHub. Wklej token w otwartym oknie albo wybierz w menu Tampermonkey „Landek: ustaw lub zmień token GitHub”.', true);
            window.setTimeout(configureToken, 100);
            return;
        }

        try {
            const source = validateCore(await requestCore(token));
            GM_setValue(STORAGE.cachedSource, source);
            GM_setValue(STORAGE.cachedAt, Date.now());
            executeCore(source);
        } catch (error) {
            if (error?.status === 401 || error?.status === 404) {
                showMessage('Brak dostępu do prywatnego repozytorium. Sprawdź token oraz jego dostęp do repozytorium landeq/landek-menedzer-atakow (Contents: Read-only).', true);
                return;
            }

            if (canUseCache(error)) {
                try {
                    const source = cachedSource();
                    if (source) {
                        console.warn('[Landek loader] GitHub jest chwilowo niedostępny; uruchamiam ostatnią poprawną kopię lokalną.', error);
                        executeCore(source);
                        return;
                    }
                } catch (cacheError) {
                    console.error('[Landek loader] Lokalna kopia awaryjna jest nieprawidłowa.', cacheError);
                }
            }

            showMessage(`Nie udało się uruchomić Menedżera: ${error?.message || error}`, true);
        }
    }

    void main();
})();
