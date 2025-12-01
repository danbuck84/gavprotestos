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

export type ProtestStatus = 'pending' | 'under_review' | 'accepted' | 'rejected' | 'concluded' | 'inconclusive';

export interface Vote {
  adminId: string;
  adminName: string;
  verdict: 'punish' | 'acquit';
  reason: string;
  createdAt: string;
}

export interface Protest {
  id: string;
  raceId: string;
  accuserId: string;
  accusedId: string;
  lap: number;
  description: string;
  videoUrls: string[];
  incidentType: 'Colisão' | 'Bloqueio' | 'Retorno Inseguro' | 'Outro';
  heat: 'Bateria 1' | 'Bateria 2' | 'Bateria Única';
  positionsLost: number;
  status: ProtestStatus;
  verdict?: string; // 'Punido', 'Absolvido', etc.
  createdAt: string;
}
