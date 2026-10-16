import {
  CHANNELS,
  freshRecipe,
  RANGE,
  validateRecipe,
  type EditRecipe,
  type Adjustment,
} from '../domain/recipe';
const NS = 'http://ns.adobe.com/camera-raw-settings/1.0/';
const fields: Partial<Record<Adjustment, string>> = {
  exposure: 'Exposure2012',
  contrast: 'Contrast2012',
  highlights: 'Highlights2012',
  shadows: 'Shadows2012',
  whites: 'Whites2012',
  blacks: 'Blacks2012',
  vibrance: 'Vibrance',
  saturation: 'Saturation',
};
export function exportPreset(recipe: EditRecipe, format: 'json' | 'xmp') {
  const clean = { ...recipe, geometry: freshRecipe().geometry, retouch: [], removals: [] };
  if (format === 'json')
    return JSON.stringify({ format: 'frame-preset', version: 1, recipe: clean }, null, 2);
  const attrs = Object.entries(fields).map(
    ([key, name]) => `crs:${name}="${recipe[key as Adjustment]}"`,
  );
  CHANNELS.forEach((c, i) => {
    for (const [key, prefix] of [
      ['hue', 'Hue'],
      ['saturation', 'Saturation'],
      ['luminance', 'Luminance'],
    ] as const)
      attrs.push(`crs:${prefix}Adjustment${c}="${recipe.hsl[i][key]}"`);
  });
  return `<?xml version="1.0"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:crs="${NS}" crs:PresetType="Normal" crs:UUID="${crypto.randomUUID().replaceAll('-', '').toUpperCase()}" crs:SupportsAmount="False" crs:ProcessVersion="11.0" ${attrs.join(' ')}><crs:Name><rdf:Alt><rdf:li xml:lang="x-default">Frame preset</rdf:li></rdf:Alt></crs:Name></rdf:Description></rdf:RDF></x:xmpmeta>`;
}
export function importPreset(text: string, geometry: EditRecipe['geometry']) {
  if (!text.trimStart().startsWith('<')) {
    const data = JSON.parse(text);
    const recipe = validateRecipe(data.format === 'frame-preset' ? data.recipe : data);
    return {
      recipe:
        data.format === 'frame-preset'
          ? { ...recipe, geometry, retouch: [], removals: [] }
          : recipe,
      notice: '',
      preset: data.format === 'frame-preset',
    };
  }
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror') || doc.doctype) throw new Error('Invalid XMP preset');
  const recipe = freshRecipe();
  recipe.geometry = geometry;
  let count = 0;
  const supported = new Set<string>();
  function read(name: string) {
    supported.add(name);
    const attr = Array.from(doc.getElementsByTagName('*'))
      .map((e) => e.getAttributeNS(NS, name))
      .find((v) => v !== null);
    const raw = attr ?? doc.getElementsByTagNameNS(NS, name)[0]?.textContent;
    if (raw == null) return;
    const n = Number(raw);
    if (!raw.trim() || !Number.isFinite(n)) throw new Error(`Invalid XMP ${name}`);
    count++;
    return n;
  }
  for (const [key, name] of Object.entries(fields)) {
    const value = read(name);
    if (value !== undefined)
      recipe[key as Adjustment] = Math.min(
        RANGE[key as Adjustment][1],
        Math.max(RANGE[key as Adjustment][0], value),
      );
  }
  CHANNELS.forEach((c, i) => {
    for (const [key, prefix] of [
      ['hue', 'Hue'],
      ['saturation', 'Saturation'],
      ['luminance', 'Luminance'],
    ] as const) {
      const value = read(`${prefix}Adjustment${c}`);
      if (value !== undefined) recipe.hsl[i][key] = value;
    }
  });
  if (!count) throw new Error('No supported adjustments found in this XMP preset');
  return {
    recipe: validateRecipe(recipe),
    preset: true,
    notice:
      'Imported supported light, saturation, vibrance and HSL settings. Adobe profiles, white balance, curves, masks and other effects are not translated. Rendering differs from Adobe.',
  };
}
