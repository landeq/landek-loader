# Instrukcje dla Claude

To publiczne repozytorium zawiera tylko stały loader Tampermonkey. Nie zawiera prywatnego rdzenia ani sekretów.

## Zakres

- Loader odpowiada za aktywację kodu, przechowywanie sesji, sprawdzanie dostępu i pobieranie rdzenia z Workera.
- Zwykłych funkcji Menedżera nie dodawaj tutaj; należą do `landeq/landek-menedzer-atakow`.
- API, panel administratora i D1 należą do prywatnego `landeq/landek-access-service`.

## Bezpieczeństwo

- Nigdy nie dodawaj tokenu GitHub, sekretu Cloudflare, tokenu administratora ani przykładowego działającego kodu dostępu.
- Nie wprowadzaj cache rdzenia ani trybu offline omijającego bieżącą walidację licencji.
- Wygaśnięcie lub cofnięcie dostępu musi zatrzymać działanie zgodnie z odpowiedzią Workera.
- Nie zmieniaj hosta API bez równoczesnego sprawdzenia `@connect` i `API_BASE`.

## Publikacja

1. Uruchom `node --check landek.user.js`.
2. Przy każdej zmianie zachowania loadera zwiększ jego `@version`.
3. Wysyłaj zmiany przez osobną gałąź i PR.
4. Po scaleniu do `main` GitHub Pages zachowuje stały adres instalacyjny.

Nie kopiuj do tego publicznego repozytorium `loader/landek.user.js` z usługi dostępu bez porównania różnic i świadomej decyzji o publikacji.
