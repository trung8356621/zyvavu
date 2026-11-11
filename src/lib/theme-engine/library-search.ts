/** Case- and accent-insensitive fold for Widget Library search. */
export function foldLibrarySearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
}
