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
const TOKEN = 'VERANDER-MIJ-in-iets-lang-en-willekeurigs';  // in je eigen Google-project staat de echte code

// Welke agenda's (op naam, hoofdletters maken niet uit). Leeg = alle aangevinkte agenda's.
const CALENDAR_NAMES = ['JurrIris Agenda'];
// Of specifieke agenda-ID's, bijv. ['abc123@group.calendar.google.com'] (gaat voor op namen)
const CALENDARS = [];

const MAX_DAYS = 31;
// Nieuwe afspraken: alles wat in de laatste 12 uur is aangemaakt, tot zoveel dagen vooruit
const NEW_HOURS = 12;
const NEW_HORIZON_DAYS = 120;

// ---------------------------------------------------------------
// P2000: plaatsen binnen ~15 km van Amerongen (feeds van alarmeringen.nl)
// ---------------------------------------------------------------
const P2000_CITIES = [
  'amerongen','leersum','overberg','maarn','maarsbergen','doorn','driebergen-rijsenburg',
  'woudenberg','scherpenzeel','veenendaal','rhenen','wijk-bij-duurstede','cothen','langbroek',
  'leusden','renswoude','austerlitz','achterveld','stoutenburg','lunteren','ede','bennekom',
  'wageningen','ederveen','de-klomp','kesteren','opheusden','ochten','lienden','ingen',
  'eck-en-wiel','maurik','ravenswaaij','beusichem','zoelen','echteld','ijzendoorn'
];
// Alleen meldingen uit deze regio's (voorkomt bijv. Buren in Friesland of Elst bij Arnhem)
const P2000_REGIONS = ['/utrecht/', '/gelderland-midden/', '/gelderland-zuid/'];
const P2000_CACHE_SEC = 120;

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.token !== TOKEN) return json_({ error: 'geen toegang (token klopt niet)' });

  if (p.feed === 'p2000') return json_(p2000_());

  const days = Math.max(1, Math.min(MAX_DAYS, parseInt(p.days || '7', 10) || 7));
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + days * 24 * 3600 * 1000);

  const all = CalendarApp.getAllCalendars();
  const wanted = CALENDAR_NAMES.map(n => n.trim().toLowerCase());
  const cals = CALENDARS.length
    ? CALENDARS.map(id => CalendarApp.getCalendarById(id)).filter(Boolean)
    : wanted.length
      ? all.filter(c => wanted.includes(c.getName().trim().toLowerCase()))
      : all.filter(c => c.isSelected() && !c.isHidden());

  if (!cals.length) {
    return json_({ error: 'agenda niet gevonden. Beschikbaar: ' + all.map(c => c.getName()).join(', ') });
  }

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
          color: cal.getColor() || '#00f0ff',
          created: ev.getDateCreated().toISOString()
        });
      });
    } catch (err) {
      errors.push(cal.getName() + ': ' + err);
    }
  });

  events.sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : (b.allDay - a.allDay));
  return json_({ events: events, recent: recent_(cals), errors: errors, updated: new Date().toISOString() });
}

// Afspraken die in de laatste NEW_HOURS uur zijn aangemaakt (ook ver vooruit), 5 min gecachet
function recent_(cals) {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('recent');
  if (hit) return JSON.parse(hit);
  const now = new Date(), since = new Date(now.getTime() - NEW_HOURS * 3600 * 1000);
  const from = new Date(now.getTime() - 24 * 3600 * 1000), to = new Date(now.getTime() + NEW_HORIZON_DAYS * 24 * 3600 * 1000);
  const out = [], seen = {};
  cals.forEach(cal => {
    try {
      cal.getEvents(from, to).forEach(ev => {
        const c = ev.getDateCreated();
        if (c < since) return;
        const key = ev.getId();
        if (seen[key]) return;            // herhalende afspraak: alleen de eerste keer
        seen[key] = true;
        out.push({
          title: ev.getTitle() || '(geen titel)',
          location: ev.getLocation() || '',
          start: ev.getStartTime().toISOString(),
          end: ev.getEndTime().toISOString(),
          allDay: ev.isAllDayEvent(),
          created: c.toISOString()
        });
      });
    } catch (err) {}
  });
  out.sort((a, b) => a.created < b.created ? 1 : -1);
  cache.put('recent', JSON.stringify(out), 300);
  return out;
}

function p2000_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('p2000');
  if (hit) return JSON.parse(hit);

  const res = UrlFetchApp.fetchAll(P2000_CITIES.map(c => ({
    url: 'https://alarmeringen.nl/feeds/city/' + c + '.rss', muteHttpExceptions: true
  })));
  const seen = {}, items = [];
  res.forEach((r, i) => {
    if (r.getResponseCode() !== 200) return;
    r.getContentText().split('<item>').slice(1).forEach(it => {
      const g = t => { const m = it.match(new RegExp('<' + t + '>([\\s\\S]*?)</' + t + '>'));
                       return m ? decode_(m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()) : ''; };
      const link = g('link');
      if (!P2000_REGIONS.some(rg => link.indexOf(rg) !== -1)) return;
      const m = link.match(/\/(\d+)\/p2000-/);
      const id = m ? m[1] : g('guid');
      if (seen[id]) return;
      seen[id] = true;
      items.push({
        id: id,
        time: new Date(g('pubDate')).toISOString(),
        text: g('description'),
        raw: g('title'),
        city: P2000_CITIES[i],
        url: link.split('?')[0]
      });
    });
  });
  items.sort((a, b) => a.time < b.time ? 1 : -1);
  const out = { items: items.slice(0, 20), updated: new Date().toISOString() };
  cache.put('p2000', JSON.stringify(out), P2000_CACHE_SEC);
  return out;
}

function decode_(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
