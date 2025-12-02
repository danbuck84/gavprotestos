/**
 * Date formatting utilities for GAV Protestos
 * Handles Firestore Timestamps and ISO strings, formatting to pt-BR locale
 */

import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formats a date input to Brazilian Portuguese format
 * Handles Firestore Timestamps, Date objects, and ISO string dates
 * 
 * @param dateInput - Can be a Firestore Timestamp, Date object, or ISO string
 * @returns Formatted date string in "dd/MM/yyyy às HH:mm" format
 */
export function formatDate(dateInput: any): string {
    try {
        let date: Date;

        // Handle Firestore Timestamp (has toDate method)
        if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
            date = dateInput.toDate();
        }
        // Handle ISO string
        else if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        }
        // Handle Date object
        else if (dateInput instanceof Date) {
            date = dateInput;
        }
        // Handle timestamp number
        else if (typeof dateInput === 'number') {
            date = new Date(dateInput);
        }
        else {
            return 'Data inválida';
        }

        if (!isValid(date)) {
            return 'Data inválida';
        }

        return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
        console.error('Error formatting date:', error, dateInput);
        return 'Data inválida';
    }
}

/**
 * Formats a date to just the date portion (no time)
 * @param dateInput - Can be a Firestore Timestamp, Date object, or ISO string
 * @returns Formatted date string in "dd/MM/yyyy" format
 */
export function formatDateOnly(dateInput: any): string {
    try {
        let date: Date;

        if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
            date = dateInput.toDate();
        } else if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else if (typeof dateInput === 'number') {
            date = new Date(dateInput);
        } else {
            return 'Data inválida';
        }

        if (!isValid(date)) {
            return 'Data inválida';
        }

        return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
        console.error('Error formatting date:', error, dateInput);
        return 'Data inválida';
    }
}
