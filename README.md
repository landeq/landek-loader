# Landek – prywatny loader

Stały loader Tampermonkey dla prywatnego repozytorium `landeq/landek-menedzer-atakow`.

## Stały adres instalacyjny

**https://landeq.github.io/landek-loader/landek.user.js**

Ten adres instaluje wyłącznie niewielki loader. Właściwy Menedżer Ataków pozostaje w prywatnym repozytorium i jest pobierany z gałęzi `main` przy każdym odświeżeniu strony Plemiona.pl.

## Pierwsze uruchomienie

1. Zainstaluj loader ze stałego adresu powyżej.
2. Otwórz Plemiona.pl i odśwież stronę.
3. Wpisz kod dostępu otrzymany od administratora.
4. Kod zostanie przypisany do tej instalacji, a loader zapisze wyłącznie sesję dostępu.

Sesję można później sprawdzić lub usunąć z menu Tampermonkey:

- `Landek: pokaż status dostępu`
- `Landek: usuń sesję z tej przeglądarki`

## Aktualizowanie Menedżera

Edytuj i wypchnij plik `landek.user.js` na gałąź `main` prywatnego repozytorium `landeq/landek-menedzer-atakow`. Loader pomija cache GitHuba i przy następnym `F5` pobierze aktualny plik. Zwiększanie `@version` rdzenia nie jest wymagane do tego mechanizmu.

Loader nie przechowuje kopii rdzenia do pracy offline. Aktywna sesja jest kontrolowana przy F5 i okresowo w czasie działania.

## Bezpieczeństwo

- Token GitHub do prywatnego rdzenia znajduje się wyłącznie jako sekret Workera Cloudflare.
- Nigdy nie wpisuj sekretu, tokenu administratora ani działającego kodu dostępu do pliku lub commita.
- W razie podejrzenia ujawnienia kodu lub sesji administrator może natychmiast cofnąć dostęp.
- Publiczny kod tego repozytorium nie zawiera właściwego Menedżera Ataków ani tokenu.
