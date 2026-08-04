/**
 * Talking to the CEN/CENELEC search application.
 *
 * The catalogue has no API. It is an Oracle APEX application whose search is a
 * form post: a page render hands out a single-use submission token, the post
 * redirects to a result page, and that result page offers a spreadsheet export
 * of the same rows with more columns than the HTML table shows. This module is
 * the whole of that dance, kept away from the importer so the importer reads as
 * "fetch each committee, map the rows".
 *
 * Two things about the source drive the design:
 *
 *  - **A search returns at most 1 000 rows, and says nothing when it truncates.**
 *    There is no "showing 1000 of 4000" anywhere on the page. A crawl that
 *    ignored this would look complete and quietly be wrong, so `capped` is
 *    reported on every result and the importer refuses to write a run that hit
 *    the ceiling without subdividing.
 *  - **The export is bound to the session, not to the URL.** The `cs=` checksum
 *    on the export link is not per-search; the rows you get back are whatever
 *    that session last searched for. Every request therefore carries the cookie
 *    from its own form render, and a search and its export are never split
 *    across sessions.
 */

const BASE = 'https://standards.cencenelec.eu/ords';

/**
 * A real browser's User-Agent. Not evasion — the application serves a
 * JavaScript-only page to clients it does not recognise, which is a redirect
 * loop for anything scripted.
 */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

/** The result ceiling described above. */
export const RESULT_CAP = 1000;

export interface CenRow {
  committee: string;
  reference: string;
  workItem: string;
  title: string;
  status: string;
  /** Date of ratification / availability / announcement / publication / withdrawal. */
  dor: string;
  dav: string;
  doa: string;
  dop: string;
  dow: string;
}

export interface CenSearchResult {
  rows: CenRow[];
  /** True when the source returned exactly the ceiling, so rows are missing. */
  capped: boolean;
}

export interface CenCriteria {
  /** A value from TC_CODE_LIST — the partition key the importer uses. */
  tcCode?: string;
  /** A value from ICS_LIST. */
  ics?: string;
  /** Status codes S1…S6; empty means every status. */
  statuses?: string[];
  /** Substring match on the standard's reference. */
  reference?: string;
  /** A HEAD_LIST value — the deliverable type (EN, HD, TS, TR, CWA). */
  deliverable?: string;
}

/** APEX writes its hidden tokens HTML-escaped; posting them raw silently fails. */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g, '&');
}

function readHidden(html: string, name: string): string | null {
  const match = html.match(new RegExp(`name="${name}"\\s+value="([^"]*)"`));
  return match ? decodeEntities(match[1]) : null;
}

async function get(url: string, cookie?: string): Promise<Response> {
  return fetch(url, {
    headers: { 'User-Agent': UA, ...(cookie ? { Cookie: cookie } : {}) },
  });
}

/** One search, in its own session, returning the rows from the export. */
export async function search(criteria: CenCriteria): Promise<CenSearchResult> {
  const formResponse = await get(`${BASE}/f?p=CEN:105::RESET::::`);
  const cookie = (formResponse.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');
  const formHtml = await formResponse.text();

  const instance = readHidden(formHtml, 'p_instance');
  const submission = readHidden(formHtml, 'p_page_submission_id');
  if (!instance || !submission) {
    throw new Error('CEN search form did not hand out its submission tokens');
  }

  const body = new URLSearchParams();
  body.append('p_flow_id', '205');
  body.append('p_flow_step_id', '105');
  body.append('p_instance', instance);
  body.append('p_page_submission_id', submission);
  body.append('p_request', '');
  body.append('p_reload_on_submit', 'A');

  // The form posts field names and values as two parallel arrays, in order.
  body.append('f20', 'CEN_CLC_CHOICE');
  const before: [string, string][] = [
    ['KEYWORDS_AND', ''],
    ['LANGUAGE_LIST', '0'],
    ['TC_CODE_LIST', criteria.tcCode ?? ''],
    ['TC_NAME_LIST', ''],
    ['HEAD_LIST', criteria.deliverable ?? ''],
    ['STAND_REF', criteria.reference ?? ''],
    ['DIRECTIVES_LIST', ''],
  ];
  for (const [name, value] of before) {
    body.append('f10', name);
    body.append('f11', value);
  }

  body.append('f20', 'STATUS_CHOICE');
  for (const status of criteria.statuses ?? []) body.append('f21', status);

  const after: [string, string][] = [
    ['ICS_LIST', criteria.ics ?? ''],
    ['SEC_LIST', ''],
    ['SDG_LIST', ''],
  ];
  for (const [name, value] of after) {
    body.append('f10', name);
    body.append('f11', value);
  }

  const posted = await fetch(`${BASE}/wwv_flow.accept?p_context=205:105:${instance}`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'User-Agent': UA,
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const location = posted.headers.get('location');
  if (!location) {
    throw new Error(`CEN search was rejected (HTTP ${posted.status}, no redirect)`);
  }

  const resultUrl = location.startsWith('http')
    ? location
    : `${BASE}/${location.replace(/^\.?\//, '')}`;
  const resultHtml = await (await get(resultUrl, cookie)).text();

  const checksum = resultHtml.match(/FSP_EXPORT:25,XLS(?:&#38;|&amp;|&)cs=([0-9A-F]+)/i);
  if (!checksum) {
    // No export link means no result table at all — an empty search, not a failure.
    return { rows: [], capped: false };
  }

  const exportXml = await (
    await get(`${BASE}/f?p=205:125:::::FSP_LANG_ID,FSP_EXPORT:25,XLS&cs=${checksum[1]}`, cookie)
  ).text();

  const rows = parseExport(exportXml);
  return { rows, capped: rows.length >= RESULT_CAP };
}

/** The export is SpreadsheetML: one `Row` per record, `Cell/Data` per column. */
export function parseExport(xml: string): CenRow[] {
  const rows: CenRow[] = [];
  const blocks = xml.match(/<Row[^>]*>[\s\S]*?<\/Row>/g) ?? [];

  for (const block of blocks) {
    const cells = [...block.matchAll(/<Cell[^>]*>([\s\S]*?)<\/Cell>/g)].map((m) =>
      decodeEntities(m[1].replace(/<[^>]+>/g, '')).trim(),
    );
    // The header row names the first column "Committee"; skip it rather than
    // assuming it is always first, in case the export gains a title row.
    if (cells[0] === 'Committee') continue;
    if (cells.length < 5 || !cells[1]) continue;

    rows.push({
      committee: cells[0] ?? '',
      reference: cells[1] ?? '',
      workItem: cells[2] ?? '',
      title: cells[3] ?? '',
      status: cells[4] ?? '',
      dor: cells[5] ?? '',
      dav: cells[6] ?? '',
      doa: cells[7] ?? '',
      dop: cells[8] ?? '',
      dow: cells[9] ?? '',
    });
  }

  return rows;
}

/** The committee codes the search offers, read from the form itself. */
export async function listCommitteeCodes(): Promise<{ value: string; label: string }[]> {
  const html = await (await get(`${BASE}/f?p=CEN:105::RESET::::`)).text();
  const select = html.match(/<select[^>]*id="TC_CODE_LIST"[\s\S]*?<\/select>/i);
  if (!select) throw new Error('CEN search form no longer exposes the committee list');

  const options: { value: string; label: string }[] = [];
  for (const m of select[0].matchAll(/<option\s+value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g)) {
    const value = decodeEntities(m[1]).trim();
    if (!value) continue;
    options.push({ value, label: decodeEntities(m[2].replace(/<[^>]+>/g, '')).trim() });
  }
  return options;
}
