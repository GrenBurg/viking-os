# VIKING//OS — tablet-dashboard

Klok, weer (Amerongen), Google Agenda en (later) de deurbel, in cyberpunk-stijl,
als altijd-aan scherm op een Android-tablet. Geen pc of server nodig.

## Bestanden

| Bestand | Wat |
|---|---|
| `index.html` | Het dashboard (alles in één bestand) |
| `manifest.json`, `icon-192.png`, `icon-512.png` | Zodat je het als app op het startscherm zet, schermvullend |
| `agenda.gs` | Klein script voor je Google-account dat de agenda doorgeeft |

## 1. Online zetten (GitHub Pages)

1. Maak een nieuwe repo, bijv. `viking-os` (mag openbaar: er staan geen persoonlijke gegevens in).
2. Upload `index.html`, `manifest.json`, `icon-192.png`, `icon-512.png`.
3. Settings → Pages → Branch `main` / root → Save.
4. Na een minuut staat hij op `https://<jouw-naam>.github.io/viking-os/`.

## 2. Agenda koppelen (Google Apps Script)

1. Ga naar <https://script.google.com> → **Nieuw project**.
2. Plak de inhoud van `agenda.gs` erin.
3. Verander bovenaan `TOKEN` in een lange willekeurige code (bijv. 30 tekens).
4. Tandwiel (Projectinstellingen) → tijdzone **Amsterdam**.
5. **Implementeren → Nieuwe implementatie → Web-app**
   - Uitvoeren als: **Ik**
   - Wie heeft toegang: **Iedereen**
6. Geef toestemming voor je agenda (Google waarschuwt dat de app "niet geverifieerd" is,
   dat klopt: het is je eigen script → Geavanceerd → Ga naar … ).
7. Kopieer de web-app-URL en plak er `?token=JOUWCODE` achter.
   Test in een browser: je hoort JSON met je afspraken te zien.

> Iedereen met die volledige URL (inclusief token) kan je afspraken lezen.
> Deel hem dus niet en zet hem niet in de GitHub-repo; hij wordt alleen op de tablet bewaard.

Pas je het script later aan? Dan **Implementeren → Implementaties beheren → bewerken → Nieuwe versie**,
anders blijft de oude versie draaien.

## 3. Op de tablet

1. Open de GitHub Pages-URL in **Chrome**.
2. Het instellingenscherm opent vanzelf: plak de agenda-URL (met `?token=`) → **Opslaan**.
3. Chrome-menu ⋮ → **Toevoegen aan startscherm / App installeren**. Vanaf het startscherm opent hij schermvullend.
4. Tablet altijd aan:
   - Instellingen → Over de tablet → 7× tikken op *Buildnummer* → Ontwikkelaarsopties → **Stand-by uitstellen tijdens opladen / Stay awake** aan.
   - Het dashboard vraagt zelf ook om het scherm aan te houden (Wake Lock).
5. Instellingen later aanpassen: **tik 5× snel op het logo** linksboven.

## Deurbel (Tapo)

Een tabletbrowser kan zelf geen Tapo-camerabeeld openen; daarvoor is een tussenstation nodig
(bijv. *go2rtc* op een apparaat dat altijd aan staat). Zolang dat er niet is, wordt het deurbelvak verborgen.

Makkelijkste tussenoplossing: installeer de **Tapo-app** op de tablet en zet meldingen aan.
Als er wordt aangebeld, krijg je dan een melding of belscherm van de Tapo-app met livebeeld, boven op het dashboard.

Komt er later wel een stream (bijv. `http://192.168.1.x:1984/stream.html?src=deurbel`),
vul die dan in bij *Deurbel-stream* in de instellingen.

## Weer

Komt van Open-Meteo (gratis, geen account). Elke 15 minuten bijgewerkt; agenda elke 5 minuten.
