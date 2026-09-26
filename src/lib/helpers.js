import { supabase } from './supabaseClient';

export function formatPrice(value) {
  const n = Number(value || 0);
  return `৳${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function discountPercent(regular, discounted) {
  const r = Number(regular || 0);
  const d = Number(discounted || 0);
  if (!r || d >= r) return 0;
  return Math.round(((r - d) / r) * 100);
}

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// Uploads a File to the public "media" bucket and returns its public URL.
export async function uploadImage(file, folder = 'general') {
  if (!file) return null;
  const ext = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

export function whatsappLink(number, message = '') {
  const digits = (number || '').replace(/[^\d+]/g, '').replace('+', '');
  const q = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${q}`;
}

// Cartesian product of attribute values, e.g.
// [{name:'Size', values:['S','M']}, {name:'Color', values:['Red']}]
// -> [{Size:'S', Color:'Red'}, {Size:'M', Color:'Red'}]
export function cartesianAttributes(attributes) {
  return attributes
    .filter((a) => a.name && a.values?.length)
    .reduce(
      (acc, attr) =>
        acc.flatMap((combo) => attr.values.map((v) => ({ ...combo, [attr.name]: v }))),
      [{}]
    );
}

// Short, SKU-safe fragment from an attribute value, e.g. "Red" -> "RED", "Extra Large" -> "EXTLAR"
export function skuFragment(value) {
  return (value || '')
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'VAR';
}

// Builds a suggested variant SKU from the parent SKU + each attribute value, e.g.
// TSH-00102 + {Size:'S', Color:'Red'} -> TSH-00102-RED-S (values sorted by attribute name for stability)
export function buildVariantSku(parentSku, attributes) {
  const parts = Object.keys(attributes)
    .sort()
    .map((key) => skuFragment(attributes[key]));
  return [parentSku, ...parts].filter(Boolean).join('-');
}

export function attributesEqual(a, b) {
  const aKeys = Object.keys(a || {});
  const bKeys = Object.keys(b || {});
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => a[k] === b[k]);
}
