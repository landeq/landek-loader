// ==UserScript==
// @name         Landek - Menedżer Ataków
// @namespace    https://github.com/landeq/landek-loader
// @version      2.0.0
// @description  Licencjonowany loader prywatnego Menedżera Ataków Landek.
// @homepageURL  https://github.com/landeq/landek-loader
// @supportURL   https://github.com/landeq/landek-loader/issues
// @downloadURL  https://landeq.github.io/landek-loader/landek.user.js
// @updateURL    https://landeq.github.io/landek-loader/landek.user.js
// @match        *://*.plemiona.pl/game.php*
// @run-at       document-idle
// @connect      landek-access.landek.workers.dev
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    'use strict';

    const API_BASE = 'https://landek-access.landek.workers.dev';
    const HEARTBEAT_MS = 60 * 1000;
    const MAX_HEARTBEAT_FAILURES = 2;
    const STORAGE = Object.freeze({
        installationId: 'landek_license_installation_v1',
        sessionToken: 'landek_license_session_v1',
        expiresAt: 'landek_license_expires_v1',
        notice: 'landek_license_notice_v1'
    });

    let heartbeatFailures = 0;
    let runtimeStarted = false;
    let invalidating = false;

    class RequestError extends Error {
        constructor(status, data, fallbackMessage) {
            super(data?.message || fallbackMessage || `HTTP ${status}`);
            this.status = status;
            this.code = data?.code || '';
        }
    }

    function installationId() {
        let value = String(GM_getValue(STORAGE.installationId, '') || '');
        if (!value) {
            const random = typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
            value = `inst_${random}`;
            GM_setValue(STORAGE.installationId, value);
        }
        return value;
    }

    function sessionToken() {
        return String(GM_getValue(STORAGE.sessionToken, '') || '').trim();
    }

    function clearSession() {
        GM_deleteValue(STORAGE.sessionToken);
        GM_deleteValue(STORAGE.expiresAt);
    }

    function request(path, options = {}) {
        return new Promise((resolve, reject) => {
            const token = options.token ?? sessionToken();
            const headers = {
                Accept: options.expectScript ? 'application/javascript' : 'application/json',
                'Cache-Control': 'no-cache',
                'X-Landek-Installation': installationId(),
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            };

            GM_xmlhttpRequest({
                method: options.method || 'GET',
                url: `${API_BASE}${path}?_=${Date.now()}`,
                headers,
                data: options.body ? JSON.stringify(options.body) : undefined,
                timeout: options.timeout || 20000,
                onload(response) {
                    if (response.status >= 200 && response.status < 300) {
                        if (options.expectScript) {
                            resolve(response.responseText);
                            return;
                        }
                        try {
                            resolve(JSON.parse(response.responseText || '{}'));
                        } catch {
                            reject(new RequestError(response.status, null, 'Serwer zwrócił nieprawidłową odpowiedź.'));
                        }
                        return;
                    }

                    let data = null;
                    try { data = JSON.parse(response.responseText || '{}'); } catch {}
                    reject(new RequestError(response.status, data, `Serwer zwrócił HTTP ${response.status}.`));
                },
                ontimeout() {
                    reject(new RequestError(0, null, 'Przekroczono czas oczekiwania na serwer licencji.'));
                },
                onerror() {
                    reject(new RequestError(0, null, 'Nie udało się połączyć z serwerem licencji.'));
                }
            });
        });
    }

    function removeDialog() {
        document.getElementById('landek-license-overlay')?.remove();
    }

    function licenseDialog(message = '', error = false) {
        removeDialog();
        const overlay = document.createElement('div');
        overlay.id = 'landek-license-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:18px;background:rgba(5,9,14,.84);font:14px/1.45 Arial,sans-serif;color:#eef2f7';

        const card = document.createElement('div');
        card.style.cssText = 'width:min(430px,100%);padding:24px;border:1px solid #41566b;border-radius:14px;background:#172431;box-shadow:0 22px 70px #000b';
        const title = document.createElement('h2');
        title.textContent = 'Landek — dostęp';
        title.style.cssText = 'margin:0 0 8px;color:#f0c988;font-size:20px';
        const description = document.createElement('p');
        description.textContent = message || 'Wpisz jednorazowy kod otrzymany od administratora.';
        description.style.cssText = `margin:0 0 14px;color:${error ? '#ffaaa4' : '#aebdca'}`;
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'LDK-XXXXX-XXXXX-XXXXX-XXXXX';
        input.maxLength = 27;
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.style.cssText = 'width:100%;padding:11px;border:1px solid #40566b;border-radius:8px;background:#0f1a24;color:#fff;font:700 14px monospace;text-transform:uppercase;box-sizing:border-box';
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Aktywuj dostęp';
        button.style.cssText = 'width:100%;margin-top:10px;padding:11px;border:1px solid #c79545;border-radius:8px;background:#dfa757;color:#261b0c;font-weight:800;cursor:pointer';
        const footer = document.createElement('small');
        footer.textContent = 'Kod zostanie przypisany do tej instalacji Tampermonkey. Nie jest zapisywany po aktywacji.';
        footer.style.cssText = 'display:block;margin-top:11px;color:#7f93a5';

        async function submit() {
            if (button.disabled) return;
            const code = input.value.trim().toUpperCase();
            if (!code) return;
            button.disabled = true;
            button.textContent = 'Sprawdzanie…';
            description.textContent = 'Łączenie z serwerem licencji…';
            description.style.color = '#aebdca';
            try {
                const result = await request('/v1/activate', {
                    method: 'POST',
                    token: '',
                    body: { code, installationId: installationId() }
                });
                GM_setValue(STORAGE.sessionToken, result.sessionToken);
                GM_setValue(STORAGE.expiresAt, Number(result.expiresAt || 0));
                input.value = '';
                removeDialog();
                await loadLicensedCore();
            } catch (requestError) {
                description.textContent = requestError.message;
                description.style.color = '#ffaaa4';
                button.disabled = false;
                button.textContent = 'Aktywuj dostęp';
            }
        }

        button.addEventListener('click', submit);
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') void submit();
        });
        card.append(title, description, input, button, footer);
        overlay.append(card);
        (document.body || document.documentElement).appendChild(overlay);
        window.setTimeout(() => input.focus(), 50);
    }

    function validateCore(source) {
        if (typeof source !== 'string' || source.length < 1000) {
            throw new Error('Serwer zwrócił pusty albo niekompletny skrypt.');
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
        const runner = new Function(
            'pageWindow',
            `with (pageWindow) {\n${source}\n}\n//# sourceURL=landek-licensed-core.user.js`
        );
        runner(unsafeWindow);
        runtimeStarted = true;
    }

    function rememberNotice(message) {
        GM_setValue(STORAGE.notice, String(message || 'Dostęp utracony.'));
    }

    function invalidateRuntime(message, removeSession = true) {
        if (invalidating) return;
        invalidating = true;
        if (removeSession) clearSession();
        rememberNotice(message);
        if (runtimeStarted) {
            unsafeWindow.location.reload();
        } else {
            licenseDialog(message, true);
            invalidating = false;
        }
    }

    function isAccessDenied(error) {
        return error?.status === 401 || error?.status === 403 || ['expired', 'revoked', 'inactive', 'invalid_session'].includes(error?.code);
    }

    async function heartbeat() {
        try {
            await request('/v1/status', { timeout: 12000 });
            heartbeatFailures = 0;
        } catch (error) {
            if (isAccessDenied(error)) {
                invalidateRuntime(error.message, true);
                return;
            }
            heartbeatFailures++;
            console.warn(`[Landek licencja] Kontrola dostępności nie powiodła się (${heartbeatFailures}/${MAX_HEARTBEAT_FAILURES}).`, error);
            if (heartbeatFailures >= MAX_HEARTBEAT_FAILURES) {
                invalidateRuntime('Utracono połączenie z serwerem licencji. Skrypt zatrzymano do czasu ponownej weryfikacji.', false);
            }
        }
    }

    function startHeartbeat() {
        window.setInterval(() => void heartbeat(), HEARTBEAT_MS);
    }

    async function loadLicensedCore() {
        try {
            const source = validateCore(await request('/v1/script', { expectScript: true }));
            executeCore(source);
            startHeartbeat();
        } catch (error) {
            if (isAccessDenied(error)) {
                clearSession();
                licenseDialog(error.message, true);
                return;
            }
            licenseDialog(`Nie udało się bezpiecznie uruchomić Menedżera: ${error.message}`, true);
        }
    }

    async function showStatus() {
        if (!sessionToken()) {
            licenseDialog('Ta instalacja nie ma aktywnej sesji.', true);
            return;
        }
        try {
            const result = await request('/v1/status');
            const expires = new Date(Number(result.expiresAt) * 1000).toLocaleString('pl-PL', { hour12: false });
            unsafeWindow.alert(`Dostęp aktywny do: ${expires}`);
        } catch (error) {
            unsafeWindow.alert(`Status licencji: ${error.message}`);
        }
    }

    function logout() {
        if (!unsafeWindow.confirm('Usunąć sesję dostępu z tej przeglądarki? Wykorzystanego kodu nie będzie można wpisać ponownie bez pomocy administratora.')) return;
        clearSession();
        unsafeWindow.location.reload();
    }

    async function main() {
        GM_registerMenuCommand('Landek: pokaż status dostępu', () => void showStatus());
        GM_registerMenuCommand('Landek: usuń sesję z tej przeglądarki', logout);

        if (API_BASE.includes('REPLACE_WITH_WORKER_HOST')) {
            licenseDialog('Loader oczekuje na wdrożenie serwera licencji. Administrator musi uzupełnić adres API.', true);
            return;
        }

        const notice = String(GM_getValue(STORAGE.notice, '') || '');
        if (notice) GM_deleteValue(STORAGE.notice);
        if (!sessionToken()) {
            licenseDialog(notice || 'Wpisz jednorazowy kod otrzymany od administratora.', Boolean(notice));
            return;
        }
        await loadLicensedCore();
    }

    void main();
})();
