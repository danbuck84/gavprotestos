export interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  role?: 'admin' | 'driver' | 'super-admin';
}

export interface RaceDriver {
  name: string;
  steamId: string;
}

export interface Race {
  id: string;
  trackName: string;
  date: string; // ISO string or timestamp
  serverName: string;
  drivers: RaceDriver[];
}

export type ProtestStatus = 'pending' | 'accepted' | 'rejected';

export interface Protest {
  id: string;
  raceId: string;
  accuserId: string;
  accusedId: string;
  lap: number;
  description: string;
  videoUrl: string;
  incidentType: 'Colisão' | 'Bloqueio' | 'Retorno Inseguro' | 'Outro';
  videoMinute: string;
  status: ProtestStatus;
  verdict?: string;
  createdAt: string;
}
