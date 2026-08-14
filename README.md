# Landek – prywatny loader

Stały loader Tampermonkey dla prywatnego repozytorium `landeq/landek-menedzer-atakow`.

## Stały adres instalacyjny

**https://landeq.github.io/landek-loader/landek.user.js**

Ten adres instaluje wyłącznie niewielki loader. Właściwy Menedżer Ataków pozostaje w prywatnym repozytorium i jest pobierany z gałęzi `main` przy każdym odświeżeniu strony Plemiona.pl.

## Pierwsze uruchomienie

1. Utwórz na GitHubie token typu **Fine-grained personal access token**.
2. W `Repository access` wybierz **Only select repositories** i zaznacz `landek-menedzer-atakow`.
3. W `Repository permissions` ustaw wyłącznie **Contents: Read-only**. Uprawnienie `Metadata: Read-only` zostanie dodane automatycznie.
4. Zainstaluj loader ze stałego adresu powyżej.
5. Otwórz Plemiona.pl i wklej token do okna loadera. Token zostanie zapisany tylko lokalnie przez Tampermonkey.

Token można później zmienić lub usunąć z menu Tampermonkey:

- `Landek: ustaw lub zmień token GitHub`
- `Landek: usuń token i cache`

## Aktualizowanie Menedżera

Edytuj i wypchnij plik `landek.user.js` na gałąź `main` prywatnego repozytorium `landeq/landek-menedzer-atakow`. Loader pomija cache GitHuba i przy następnym `F5` pobierze aktualny plik. Zwiększanie `@version` rdzenia nie jest wymagane do tego mechanizmu.

Loader zachowuje ostatnią poprawnie pobraną wersję jako lokalną kopię awaryjną. Korzysta z niej tylko przy problemie sieciowym, limicie GitHub API lub awarii serwera. Błędny token nie uruchamia kopii awaryjnej.

## Bezpieczeństwo

- Nigdy nie wpisuj tokenu bezpośrednio do pliku ani commita.
- Token powinien mieć dostęp tylko do odczytu jednego repozytorium.
- W razie podejrzenia ujawnienia natychmiast unieważnij token w ustawieniach GitHuba.
- Publiczny kod tego repozytorium nie zawiera właściwego Menedżera Ataków ani tokenu.
