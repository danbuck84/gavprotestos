/**
 * Translation utilities for GAV Protestos
 * Centralizes all UI text translations to Portuguese (pt-BR)
 */

export const statusLabels = {
    pending: 'Pendente',
    under_review: 'Em Análise',
    concluded: 'Concluído',
    inconclusive: 'Inconclusivo',
    accepted: 'Aceito',
    rejected: 'Rejeitado'
} as const;

export type ProtestStatusKey = keyof typeof statusLabels;

/**
 * Translates a protest status to Portuguese
 * @param status - The status key in English
 * @returns The translated status label in Portuguese
 */
export function translateStatus(status: string): string {
    return statusLabels[status as ProtestStatusKey] || status;
}
