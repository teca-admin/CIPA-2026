
export interface Candidate {
  id: string;
  number: string;
  name: string;
  party?: string;
  photoUrl: string;
}

export interface Vote {
  id: string;
  candidateNumber: string; 
  timestamp: number;
  timestampManaus?: string; // Horário formatado de Manaus
}

export enum ViewMode {
  VOTING = 'VOTING',
  ADMIN = 'ADMIN'
}

export interface ElectionData {
  candidates: Candidate[];
  votes: Vote[];
}
