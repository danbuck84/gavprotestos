import type { Race, RaceDriver } from '../types';

export const parseRaceJson = (jsonData: any): Race => {
    const driversMap = new Map<string, RaceDriver>();

    // Strategy 1: Parse from 'Result' array (End of race results)
    if (jsonData.Result && Array.isArray(jsonData.Result)) {
        jsonData.Result.forEach((entry: any) => {
            if (entry.DriverGuid && entry.DriverName) {
                driversMap.set(entry.DriverGuid, {
                    name: entry.DriverName,
                    steamId: entry.DriverGuid
                });
            }
        });
    }

    // Strategy 2: Parse from 'Cars' array (Entry list/Qualy) - Fallback or merge
    if (jsonData.Cars && Array.isArray(jsonData.Cars)) {
        jsonData.Cars.forEach((car: any) => {
            if (car.Driver && car.Driver.Guid) {
                // Only add if not already present (Result usually has more accurate final names if changed)
                if (!driversMap.has(car.Driver.Guid)) {
                    driversMap.set(car.Driver.Guid, {
                        name: car.Driver.Name,
                        steamId: car.Driver.Guid
                    });
                }
            }
        });
    }

    const drivers = Array.from(driversMap.values());

    return {
        id: '', // To be assigned by Firestore
        eventName: jsonData.EventName || '',
        trackName: jsonData.TrackName || 'Desconhecida',
        date: jsonData.Date || new Date().toISOString(),
        type: jsonData.Type || 'RACE', // Captura Type do JSON (RACE, QUALIFY, PRACTICE)
        drivers
    };
};
