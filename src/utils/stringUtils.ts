/**
 * Extrai iniciais de um nome completo
 * @param name - Nome completo (ex: "Daniel Buck", "Ayrton", "João da Silva")
 * @returns Iniciais em maiúsculas (ex: "DB", "A", "JS")
 */
export function getInitials(name: string | null | undefined): string {
    if (!name) return 'U';

    const words = name.trim().split(/\s+/).filter(word => word.length > 0);

    if (words.length === 0) return 'U';
    if (words.length === 1) return words[0][0].toUpperCase();

    // Pega primeira letra da primeira e última palavra
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
