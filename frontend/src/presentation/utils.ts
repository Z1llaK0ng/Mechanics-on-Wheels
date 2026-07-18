/**
 * Capitalizes the first letter of each word in a string, preserving subsequent casings.
 * e.g., "kofi mensah" -> "Kofi Mensah", "kwame auto works" -> "Kwame Auto Works".
 */
export function capitalizeName(name: string): string {
    if (!name) return name;
    return name
        .split(' ')
        .map(word => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
        .join(' ');
}
