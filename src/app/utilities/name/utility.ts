import * as path from 'path';
import sanitizeFilename from 'sanitize-filename';

const MAX_FILENAME_LEN = 220;

/** Basename для диска и БД: `sanitize-filename` + лимит длины (как прежний FileName). */
export function FileName(original: string): string {
  let base = path.basename((original || '').trim());
  if (!base || base === '.' || base === '..') {
    return 'file';
  }

  base = sanitizeFilename(base, { replacement: '_' });
  if (!base) {
    return 'file';
  }

  if (base.length > MAX_FILENAME_LEN) {
    const ext = path.extname(base);
    const stem = path.basename(base, ext);
    base = stem.slice(0, Math.max(1, MAX_FILENAME_LEN - ext.length)) + ext;
  }

  return base;
}
