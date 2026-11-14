/**
 * VIKING//OS — agenda-koppeling
 *
 * Dit script draait in je eigen Google-account en geeft de afspraken van de
 * komende dagen terug als JSON voor het dashboard op de tablet.
 *
 * Installatie (eenmalig):
 *  1. Ga naar https://script.google.com  ->  Nieuw project
 *  2. Plak deze hele code erin (vervang wat er staat) en kies hieronder een eigen TOKEN
 *  3. Projectinstellingen (tandwiel): tijdzone = (GMT+01:00) Amsterdam
 *  4. Implementeren -> Nieuwe implementatie -> type "Web-app"
 *       Uitvoeren als:       Ik
 *       Wie heeft toegang:   Iedereen
 *  5. Geef toestemming voor je agenda, kopieer de web-app-URL
 *  6. Op de tablet: <web-app-URL>?token=<jouw TOKEN>
 */

// Kies een lange, willekeurige code. Zonder deze code geeft het script niets terug.
const TOKEN = 'VERANDER-MIJ-in-iets-lang-en-willekeurigs';

// Leeg = alle agenda's die in Google Agenda aangevinkt staan.
// Of noem specifieke agenda-ID's, bijv. ['jouw.adres@gmail.com', 'abc123@group.calendar.google.com']
const CALENDARS = [];

const MAX_DAYS = 31;

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.token !== TOKEN) return json_({ error: 'geen toegang (token klopt niet)' });

  const days = Math.max(1, Math.min(MAX_DAYS, parseInt(p.days || '7', 10) || 7));
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + days * 24 * 3600 * 1000);

  const cals = CALENDARS.length
    ? CALENDARS.map(id => CalendarApp.getCalendarById(id)).filter(Boolean)
    : CalendarApp.getAllCalendars().filter(c => c.isSelected() && !c.isHidden());

  const events = [], errors = [];
  cals.forEach(cal => {
    try {
      cal.getEvents(start, end).forEach(ev => {
        events.push({
          title: ev.getTitle() || '(geen titel)',
          location: ev.getLocation() || '',
          start: ev.getStartTime().toISOString(),
          end: ev.getEndTime().toISOString(),
          allDay: ev.isAllDayEvent(),
          calendar: cal.getName(),
          color: cal.getColor() || '#00f0ff'
        });
      });
    } catch (err) {
      errors.push(cal.getName() + ': ' + err);
    }
  });

  events.sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : (b.allDay - a.allDay));
  return json_({ events: events, errors: errors, updated: new Date().toISOString() });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
