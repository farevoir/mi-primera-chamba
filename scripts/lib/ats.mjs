// Public job-board APIs of applicant tracking systems (ATS), normalized to one posting shape:
// { ats, board, id, company, title, locations[], remote, published (ms|null), url, salary, text }
// ATS APIs list only open postings, so a posting missing from its board is closed.
import { decode, htmlToText } from './text.mjs';

const HEADERS = { 'User-Agent': 'job-search-script', Accept: 'application/json' };

async function get(url, as = 'json') {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return as === 'json' ? r.json() : r.text();
}

const COUNTRY = { mx: 'Mexico', us: 'United States', co: 'Colombia', br: 'Brazil', ar: 'Argentina', cl: 'Chile', ca: 'Canada' };

// One adapter per ATS: board name -> raw postings.
const adapters = {
  async greenhouse(name) {
    const d = await get(`https://boards-api.greenhouse.io/v1/boards/${name}/jobs?content=true`);
    return d.jobs.map(j => ({
      id: String(j.id), company: j.company_name, title: j.title,
      locations: [j.location?.name, ...(j.offices ?? []).map(o => o.name)],
      published: Date.parse(j.first_published ?? j.updated_at), url: j.absolute_url, text: htmlToText(decode(j.content ?? '')),
    }));
  },
  async lever(name) {
    const d = await get(`https://api.lever.co/v0/postings/${name}?mode=json`);
    return d.map(j => ({
      id: j.id, title: j.text,
      locations: [j.categories?.location, ...(j.categories?.allLocations ?? []), j.country],
      remote: j.workplaceType === 'remote', published: j.createdAt, url: j.hostedUrl,
      salary: j.salaryRange ? `${j.salaryRange.min}–${j.salaryRange.max} ${j.salaryRange.currency}/${j.salaryRange.interval}` : '',
      text: [j.descriptionPlain, ...(j.lists ?? []).map(l => `${l.text}\n${htmlToText(l.content)}`), j.additionalPlain].join('\n'),
    }));
  },
  async ashby(name) {
    const d = await get(`https://api.ashbyhq.com/posting-api/job-board/${name}?includeCompensation=true`);
    return d.jobs.map(j => ({
      id: j.id, title: j.title,
      locations: [j.location, ...(j.secondaryLocations ?? []).map(s => s.location), j.address?.postalAddress?.addressCountry],
      remote: j.isRemote, published: Date.parse(j.publishedAt), url: j.jobUrl,
      salary: j.compensation?.compensationTierSummary, text: j.descriptionPlain,
    }));
  },
  async workable(name) {
    const d = await get(`https://apply.workable.com/api/v1/widget/accounts/${name}?details=true`);
    return d.jobs.map(j => ({
      id: j.shortcode, company: d.name, title: j.title,
      locations: [...(j.locations ?? []).map(l => [l.city, l.region, l.country].filter(Boolean).join(', ')), j.country],
      remote: j.telecommuting, published: Date.parse(j.published_on ?? j.created_at), url: j.url ?? j.application_url,
      text: htmlToText(j.description ?? ''),
    }));
  },
  async smartrecruiters(name) {
    const all = [];
    for (let offset = 0; offset < 1000; offset += 100) {
      const d = await get(`https://api.smartrecruiters.com/v1/companies/${name}/postings?limit=100&offset=${offset}`);
      all.push(...d.content);
      if (all.length >= d.totalFound || !d.content.length) break;
    }
    return all.map(j => ({
      id: String(j.id), company: j.company?.name, title: j.name,
      locations: [j.location?.fullLocation, j.location?.remote && 'Remote', COUNTRY[j.location?.country] ?? j.location?.country],
      remote: j.location?.remote, published: Date.parse(j.releasedDate),
      url: `https://jobs.smartrecruiters.com/${j.company?.identifier ?? name}/${j.id}`,
    }));
  },
  async breezy(name) {
    const d = await get(`https://${name}.breezy.hr/json`);
    return d.map(j => ({
      id: j.id, company: j.company?.name, title: j.name,
      locations: (j.locations ?? [j.location]).flatMap(l => [l?.name, l?.country?.name, l?.is_remote && 'Remote']),
      remote: j.location?.is_remote, published: Date.parse(j.published_date), url: j.url, salary: j.salary,
    }));
  },
  async recruitee(name) {
    const d = await get(`https://${name}.recruitee.com/api/offers/`);
    return d.offers.map(j => ({
      id: j.slug, company: j.company_name, title: j.title,
      locations: [j.location, j.country, ...(j.locations ?? []).map(l => l.name ?? l.city), j.remote && 'Remote'],
      remote: j.remote, published: Date.parse(j.published_at), url: j.careers_url,
      text: htmlToText([j.description, j.requirements].filter(Boolean).join('\n')),
    }));
  },
  async teamtailor(name) {
    const xml = await get(`https://${name}.teamtailor.com/jobs.rss`, 'text');
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
      const tag = t => it.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, '').trim() ?? '';
      const link = tag('link');
      return {
        id: link.match(/\/jobs\/(\d+)/)?.[1] ?? link, title: decode(tag('title')),
        locations: [...it.matchAll(/<tt:(?:city|country|name)>([^<]*)</g)].map(m => m[1]),
        published: Date.parse(tag('pubDate')), url: link, text: htmlToText(decode(tag('description'))),
      };
    });
  },
  async rippling(name) {
    const d = await get(`https://api.rippling.com/platform/api/ats/v1/board/${name}/jobs`);
    return d.map(j => ({ id: j.uuid, title: j.name, locations: [j.workLocation?.label], url: j.url }));
  },
};

export const SUPPORTED = Object.keys(adapters);

export async function board(ats, name) {
  if (!adapters[ats]) throw new Error(`unknown ATS "${ats}"`);
  return (await adapters[ats](name)).map(j => ({
    ...j, ats, board: name, company: j.company || name, salary: j.salary || '', text: j.text || '',
    locations: [...new Set(j.locations.filter(Boolean))],
    published: Number.isFinite(j.published) ? j.published : null,
  }));
}

// Some list endpoints have no description: fetch one posting's text on demand.
export async function details(j) {
  if (j.text) return j;
  try {
    if (j.ats === 'smartrecruiters') {
      const d = await get(`https://api.smartrecruiters.com/v1/companies/${j.board}/postings/${j.id}`);
      j.text = Object.values(d.jobAd?.sections ?? {}).map(s => `${s.title ?? ''}\n${htmlToText(s.text ?? '')}`).join('\n\n');
      j.url = d.postingUrl ?? j.url;
    } else if (j.ats === 'rippling') {
      const d = await get(`https://api.rippling.com/platform/api/ats/v1/board/${j.board}/jobs/${j.id}`);
      j.text = htmlToText(Object.values(d.description ?? {}).join('\n'));
    } else if (j.ats === 'breezy') {
      const page = await get(j.url, 'text');
      j.text = htmlToText(page.match(/<div class="description"[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? page.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ''));
    }
  } catch { /* leave text empty */ }
  return j;
}

const URL_PATTERNS = [
  ['greenhouse', /greenhouse\.io\/(?:embed\/job_app\?for=)?([\w-]+)\/jobs\/(\d+)/],
  ['lever', /jobs\.lever\.co\/([\w-]+)\/([0-9a-f-]{36})/i],
  ['ashby', /jobs\.ashbyhq\.com\/([\w.-]+)\/([0-9a-f-]{36})/i],
  ['workable', /apply\.workable\.com\/([\w-]+)\/j\/([0-9A-F]{10})/i],
  ['smartrecruiters', /jobs\.smartrecruiters\.com\/([\w-]+)\/(\d+)/i],
  ['breezy', /([\w-]+)\.breezy\.hr\/p\/([0-9a-f]{12})/i],
  ['recruitee', /([\w-]+)\.recruitee\.com\/o\/([\w-]+)/i],
  ['teamtailor', /([\w-]+)\.teamtailor\.com\/jobs\/(\d+)/i],
  ['rippling', /ats\.rippling\.com\/([\w-]+)\/jobs\/([0-9a-f-]{36})/i],
];

// A posting URL -> { ats, board, id }, or null when its ATS has no supported API.
export function parseUrl(url) {
  for (const [ats, re] of URL_PATTERNS) {
    const m = url.match(re);
    if (m) return { ats, board: m[1], id: m[2] };
  }
  return null;
}

// Runs fn over items with at most `size` requests in flight.
export async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}
