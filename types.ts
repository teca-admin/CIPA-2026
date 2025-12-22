
export interface Candidate {
  id: string;
  number: string;
  name: string;
  party?: string;
  photoUrl: string;
}

export interface Vote {
  id: string;
  candidateNumber: string; // "BRANCO", "NULO" or the candidate number
  timestamp: number;
}

export enum ViewMode {
  VOTING = 'VOTING',
  ADMIN = 'ADMIN'
}

export interface ElectionData {
  candidates: Candidate[];
  votes: Vote[];
}
