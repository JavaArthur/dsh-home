const UNAVAILABLE = '暂时无法获取在线壁纸，请稍后重试。';

// Factual photo IDs, image paths and author credits researched from the GPL reference:
// https://raw.githubusercontent.com/joeseesun/qiaomu-home-dsh/main/src/client/data.js
// Only photo metadata is reused; provider and validation logic are independently implemented.
const CURATED = [
  ['Q1p7bh3SHj8', 'photo-1451187580459-43490279c0fa', 'NASA'],
  ['phIFdC6lA4E', 'photo-1519681393784-d120267933ba', 'Benjamin Voros'],
  ['sO-JmQj95ec', 'photo-1492724724894-7464c27d0ceb', 'Kevin Lanceplaine'],
  ['c9MFM8rSMsQ', 'photo-1541599468348-e96984315921', 'Michelle Spollen'],
  ['oUTmhg97gzY', 'photo-1615390265246-72d3198a48b7', 'Ása Steinarsdóttir'],
  ['NRQV-hBF10M', 'photo-1506744038136-46273834b3fb', 'Bailey Zindel'],
  ['1Z2niiBPg5A', 'photo-1470071459604-3b5ec3a7fe05', 'v2osk'],
  ['JgOeRuGD_Y4', 'photo-1477346611705-65d1883cee1e', 'JOHN TOWNER'],
  ['DlkF4-dbCOU', 'photo-1493246507139-91e8fad9978e', 'garrett parker'],
  ['6KQETG8J-zI', 'photo-1581610186406-5f6e9f9edbc1', 'Daniel Olah'],
  ['hvrpOmuMrAI', 'photo-1500673922987-e212871fec22', 'Johannes Plenio'],
  ['RwHv7LgeC7s', 'photo-1523712999610-f77fbcfc3843', 'Johannes Plenio'],
  ['_RBcxo9AU-U', 'photo-1472214103451-9374bd1c798e', 'Robert Lukeman'],
  ['17_tB-oI0ao', 'photo-1551309292-e185c0b6e22a', 'Alessio Soggetti'],
  ['2Hzmz15wGik', 'photo-1511884642898-4c92249e20b6', 'pine watt'],
  ['7BjhtdogU3A', 'photo-1475070929565-c985b496cb9f', 'Karsten Würth'],
  ['GA09PKfRIQY', 'photo-1559310589-2673bfe16970', 'Adam Vradenburg'],
  ['z_f2JrBRbOg', 'photo-1603979649806-5299879db16b', 'Ansgar Scheffold'],
  ['sGptUDSrMVU', 'photo-1623423415485-1d36867376b6', 'Annegret Kammer'],
  ['KMn4VEeEPR8', 'photo-1507525428034-b723cf961d3e', 'Sean Oulashin'],
];

function httpsUrl(value, host) {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('https://')
    || /[\s\\\u0000-\u001f\u007f]/u.test(value)) return null;
  try {
    const url = new URL(value);
    return url.origin === `https://${host}` && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function validatePhoto(photo) {
  const idPattern = photo.source === 'unsplash' ? /^[A-Za-z0-9_-]{11}$/ : /^\d{1,10}$/;
  if (!['unsplash', 'picsum'].includes(photo.source)
    || typeof photo.id !== 'string' || !idPattern.test(photo.id)
    || typeof photo.author !== 'string' || !photo.author.trim() || photo.author.length > 160
    || /[\u0000-\u001f\u007f]/u.test(photo.author)) return null;
  const url = httpsUrl(photo.url, photo.source === 'unsplash' ? 'images.unsplash.com' : 'picsum.photos');
  const page = httpsUrl(photo.page, 'unsplash.com');
  return url && page ? { source: photo.source, id: photo.id, url, author: photo.author.trim(), page } : null;
}

function randomIndex(random, length) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1 || !length) throw new Error(UNAVAILABLE);
  return Math.floor(value * length);
}

/** Return a validated online photo; failures reject with a safe, user-facing message. */
export function createOnlinePhotoProvider({ fetchImpl = fetch, random = Math.random } = {}) {
  return async (options = {}) => {
    try {
      const { source, excludeUrl } = options;
      let candidates;
      if (source === 'unsplash') {
        candidates = CURATED.map(([id, path, author]) => validatePhoto({
          source, id, author,
          url: `https://images.unsplash.com/${path}?auto=format&fit=crop&w=2560&q=80`,
          page: `https://unsplash.com/photos/${id}`,
        }));
      } else if (source === 'picsum') {
        // Documented list endpoint: https://picsum.photos/#list-images
        const page = randomIndex(random, 10) + 1;
        const response = await fetchImpl(`https://picsum.photos/v2/list?page=${page}&limit=100`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error(UNAVAILABLE);
        const entries = await response.json();
        if (!Array.isArray(entries) || entries.length > 100) throw new Error(UNAVAILABLE);
        candidates = entries.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
          && Number.isSafeInteger(entry.width) && Number.isSafeInteger(entry.height)
          && entry.width >= 1200 && entry.height > 0 && entry.width >= entry.height)
          .map((entry) => validatePhoto({
            source, id: entry.id, author: entry.author, page: entry.url,
            // Never use the API's arbitrary download_url as an image source.
            url: `https://picsum.photos/id/${entry.id}/2560/1440`,
          }));
      } else {
        throw new Error(UNAVAILABLE);
      }
      const available = candidates.filter((photo) => photo && photo.url !== excludeUrl);
      return available[randomIndex(random, available.length)];
    } catch {
      throw new Error(UNAVAILABLE);
    }
  };
}
