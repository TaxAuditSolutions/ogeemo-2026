/**
 * Which Google app a typed name means (pure; see tests/google-apps-commands.test.ts).
 *
 * The sidebar's Google Apps group lists 19 apps that open on another site (src/lib/google-apps.ts). Typing their names
 * used to open nothing, or the WRONG thing: "google calendar" opened Ogeemo's own Calendar and "google contacts" opened
 * Ogeemo's Contacts Hub. The rule now is:
 *   - "Google" in front of the name always means the Google app ("open google maps", "google drawings"). That is the one
 *     rule that never depends on what else Ogeemo has.
 *   - The bare name works only for apps whose name nothing in Ogeemo shares, and only after a verb ("open maps"). Calendar,
 *     Contacts, Meet, Search, Docs, Drive, Keep, Sites, Chat and Gemini need "Google", because Ogeemo has its own Calendar,
 *     Contacts Hub, Meetings, Advanced Search, Document Manager (which mirrors Drive), User Notes, Ogeemo Web and Co-Pilot.
 * The apps come from the same list the sidebar reads, so an app added there works here without another change (it needs
 * "Google" until someone decides its bare name is safe).
 */
import { allApps, type GoogleApp } from '@/lib/google-apps';

export const GOOGLE_APPS_CATEGORY = 'Google Apps';

const squash = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '');
const keyOf = (app: GoogleApp): string => squash(app.name.replace(/^google\s+/i, ''));

/** Other ways to say an app's name, by the app's own key. Singular, plural and the common longer names. */
const ALIASES: Record<string, string> = {
  map: 'maps', drawing: 'drawings', photo: 'photos', sheet: 'sheets', spreadsheet: 'sheets', spreadsheets: 'sheets',
  slide: 'slides', presentation: 'slides', presentations: 'slides', group: 'groups', site: 'sites',
  doc: 'docs', document: 'docs', documents: 'docs', mail: 'gmail', message: 'textmessages', messages: 'textmessages',
  textmessage: 'textmessages', notebook: 'notebooklm', contact: 'contacts',
};

/** The apps whose bare name nothing in Ogeemo shares. Everything else needs "Google" in front. */
const BARE_NAME_OK = new Set(['drawings', 'photos', 'sheets', 'slides', 'maps', 'gmail', 'groups', 'notebooklm', 'textmessages']);

/** "Google Maps", "Gmail", "Google Notebook LM": the name shown to the person. */
export function googleAppLabel(app: GoogleApp): string {
  return /^google\s/i.test(app.name) || /^gmail$/i.test(app.name) ? app.name : `Google ${app.name}`;
}

/**
 * The Google app that `typedName` means, or undefined. `typedName` is what is left after the verb and any "the"/"my" or
 * "app"/"page" are taken off. `hadVerb` is whether a verb ("open", "go to", "take me to") came first.
 */
export function matchGoogleApp(typedName: string, hadVerb: boolean): GoogleApp | undefined {
  const typed = (typedName || '').trim();
  const withGoogle = /^(?:the\s+)?google\s+\S/i.test(typed);
  const rest = withGoogle ? typed.replace(/^(?:the\s+)?google\s+/i, '') : typed;
  const raw = squash(rest);
  if (!raw) return undefined;
  const key = ALIASES[raw] ?? raw;
  const app = allApps.find((candidate) => keyOf(candidate) === key);
  if (!app) return undefined;
  if (withGoogle) return app;
  return hadVerb && BARE_NAME_OK.has(key) ? app : undefined;
}
