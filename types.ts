
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

export interface Voter {
  id: string;
  matricula: string;
  name: string;
  hasVoted: boolean;
  signedAt: number | null;
}

export enum ViewMode {
  VOTING = 'VOTING',
  ADMIN = 'ADMIN'
}

export interface ElectionData {
  candidates: Candidate[];
  votes: Vote[];
}
