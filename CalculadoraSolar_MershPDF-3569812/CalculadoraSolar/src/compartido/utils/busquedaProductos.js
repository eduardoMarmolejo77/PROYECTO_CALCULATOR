const RAW_SEARCH_VALUE_LIMIT = 80;

export function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[+_/\\|:;,.()[\]{}"'`]+/g, ' ')
    .replace(/[-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compactSearchText(value) {
  return normalizeSearchText(value).replace(/\s+/g, '');
}

export function getSearchTokens(value) {
  return normalizeSearchText(value).split(' ').filter(Boolean);
}

function collectRawSearchValues(value, values = [], seen = new Set(), depth = 0) {
  if (
    value === null ||
    value === undefined ||
    depth > 4 ||
    values.length >= RAW_SEARCH_VALUE_LIMIT
  ) {
    return values;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    if (text) values.push(text);
    return values;
  }

  if (typeof value !== 'object' || seen.has(value)) {
    return values;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) => collectRawSearchValues(item, values, seen, depth + 1));
    return values;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    values.push(key);
    collectRawSearchValues(nestedValue, values, seen, depth + 1);
  });

  return values;
}

export function buildProductSearchIndex(product) {
  const coreValues = [
    product.id,
    product.name,
    product.description,
    product.category,
    product.icon,
    ...(product.stockWarehouseNames || []),
  ];

  const rawValues = collectRawSearchValues(product.raw);
  const combinedText = [...coreValues, ...rawValues].join(' ');
  const haystack = normalizeSearchText(combinedText);
  const compactHaystack = compactSearchText(combinedText);
  const exactFields = {
    id: normalizeSearchText(product.id),
    name: normalizeSearchText(product.name),
    description: normalizeSearchText(product.description),
  };

  return { product, haystack, compactHaystack, exactFields };
}

export function getSearchScore(indexedProduct, searchValue) {
  const tokens = getSearchTokens(searchValue);
  if (tokens.length === 0) return 0;

  const query = normalizeSearchText(searchValue);
  const compactQuery = compactSearchText(searchValue);
  const { haystack, compactHaystack, exactFields, product } = indexedProduct;

  const matchesAllTokens = tokens.every((token) => {
    const compactToken = compactSearchText(token);
    return haystack.includes(token) || compactHaystack.includes(compactToken);
  });

  if (!matchesAllTokens) return -1;

  let score = 0;

  tokens.forEach((token) => {
    const compactToken = compactSearchText(token);

    if (exactFields.id.includes(token) || compactSearchText(product.id).includes(compactToken)) {
      score += 20;
    }

    if (exactFields.name.includes(token)) {
      score += 12;
    }

    if (exactFields.description.includes(token)) {
      score += 8;
    }

    if (haystack.includes(token)) {
      score += 3;
    }

    if (compactHaystack.includes(compactToken)) {
      score += 2;
    }
  });

  if (exactFields.id === query || compactSearchText(product.id) === compactQuery) score += 60;
  if (exactFields.id.startsWith(query) || compactSearchText(product.id).startsWith(compactQuery)) score += 35;
  if (exactFields.name.includes(query)) score += 24;
  if (exactFields.description.includes(query)) score += 16;
  if (compactHaystack.includes(compactQuery)) score += 10;

  return score;
}
