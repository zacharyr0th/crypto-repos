// Simple sanitization for common inputs
export function sanitizeInput(input: string): string {
  if (!input) return '';

  // Remove any HTML/script tags
  input = input.replace(/<[^>]*>/g, '');

  // Remove SQL injection basic patterns
  input = input.replace(/['";]/g, '');

  // Limit length
  return input.slice(0, 500);
}

// Sanitize numeric inputs
export function sanitizeNumber(input: string | null): number | undefined {
  if (!input) return undefined;
  const num = parseInt(input);
  return isNaN(num) ? undefined : num;
}

// Sanitize sort parameters
export function sanitizeSortParams(sortBy: string | null, sortOrder: string | null) {
  const validSortBy = ['stars', 'forks', 'updated'];
  const validSortOrder = ['asc', 'desc'];

  return {
    sortBy: validSortBy.includes(sortBy || '') ? sortBy : 'stars',
    sortOrder: validSortOrder.includes(sortOrder || '') ? sortOrder : 'desc',
  };
}
