/**
 * Driver Name Resolution Utilities
 * Creates lookup maps from race data to resolve Steam IDs to driver names
 */

import type { Race, RaceDriver } from '../types';

/**
 * Creates a map of Steam ID -> Driver Name from all races
 * @param races - Array of all races with driver data
 * @returns Map object with steamId as key and driver name as value
 */
export function createDriverMap(races: Race[]): Record<string, string> {
    const driverMap: Record<string, string> = {};

    if (!races || races.length === 0) {
        return driverMap;
    }

    races.forEach(race => {
        if (race.drivers && Array.isArray(race.drivers)) {
            race.drivers.forEach((driver: RaceDriver) => {
                if (driver.steamId && driver.name) {
                    // Clean steam ID (remove steam: prefix if exists)
                    const cleanId = driver.steamId.replace('steam:', '');
                    driverMap[cleanId] = driver.name;
                    // Also store with prefix for safety
                    driverMap[driver.steamId] = driver.name;
                }
            });
        }
    });

    return driverMap;
}

/**
 * Gets driver name from steam ID using the driver map
 * @param steamId - The Steam ID to lookup
 * @param driverMap - The map created by createDriverMap
 * @returns Driver name or fallback string
 */
export function getDriverName(steamId: string, driverMap: Record<string, string>): string {
    if (!steamId) return 'Piloto Desconhecido';

    // Try with and without steam: prefix
    const cleanId = steamId.replace('steam:', '');

    return driverMap[steamId] || driverMap[cleanId] || 'Piloto não encontrado';
}

/**
 * Extracts all unique driver names from races
 * @param races - Array of races
 * @returns Array of unique driver objects
 */
export function getAllDrivers(races: Race[]): RaceDriver[] {
    const driversMap = new Map<string, RaceDriver>();

    if (!races || races.length === 0) {
        return [];
    }

    races.forEach(race => {
        if (race.drivers && Array.isArray(race.drivers)) {
            race.drivers.forEach((driver: RaceDriver) => {
                if (driver.steamId) {
                    const cleanId = driver.steamId.replace('steam:', '');
                    driversMap.set(cleanId, driver);
                }
            });
        }
    });

    return Array.from(driversMap.values());
}
