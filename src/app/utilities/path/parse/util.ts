import { FileType } from '@/app/enums/enum';
import { BadRequestException } from '@nestjs/common';

export type FilePathParseResult = {
  type: FileType;
  id: number;
  name: string;
};

/**
 * Разбор полного URL файла: `{base}/{type}/{id}/{name}`.
 * `baseUrl` - значение `SERVICE_URL` / `STORAGE_URL` (может включать path, например `https://host/cdn`).
 */
export function FilePathParse(
  input: string,
  baseUrlRaw: string,
): FilePathParseResult | null {
  if (!baseUrlRaw?.trim()) {
    return null;
  }

  let inputUrl: URL;
  try {
    inputUrl = new URL(input);
  } catch {
    return null;
  }

  let base: URL;
  try {
    base = new URL(
      /^https?:\/\//i.test(baseUrlRaw) ? baseUrlRaw : `https://${baseUrlRaw}`,
    );
  } catch {
    return null;
  }

  if (inputUrl.origin !== base.origin) {
    return null;
  }

  const basePath = (base.pathname || '/').replace(/\/$/, '') || '';
  let pathname = inputUrl.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || '/';
  }

  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 3) {
    return null;
  }

  const typeStr = segments[0];
  if (typeStr !== FileType.PUBLIC && typeStr !== FileType.PRIVATE) {
    return null;
  }

  const id = Number(segments[1]);
  if (!Number.isInteger(id) || id < 1) {
    return null;
  }

  const name = decodePathSegments(segments.slice(2));

  if (!name) {
    return null;
  }

  return {
    type: typeStr as FileType,
    id,
    name,
  };
}

/** Сегмент маршрута `:type` → `public` | `private`. */
export function parseFileTypeParam(typeParam: string): FileType {
  const t = typeParam?.toLowerCase() ?? '';
  if (t === FileType.PUBLIC) {
    return FileType.PUBLIC;
  }

  if (t === FileType.PRIVATE) {
    return FileType.PRIVATE;
  }
  throw new BadRequestException({
    type: 'Тип зоны должен быть public или private',
  });
}

function decodePathSegments(segments: string[]): string {
  return segments
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })
    .join('/');
}
