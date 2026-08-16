import type { RoundRecord } from "./types";

export interface LocalStatsSummary {
  totalRounds: number;
  ownContractAttempts: number;
  ownContractsMade: number;
  ownContractRate: number;
  tricksTeam0: number;
  tricksTeam1: number;
  netScoreTeam0: number;
}

export function summarizeRoundRecords(records: RoundRecord[]): LocalStatsSummary {
  const ownContracts = records.filter((record) => record.bidderTeam === 0);
  const ownContractsMade = ownContracts.filter((record) => record.madeContract).length;
  return {
    totalRounds: records.length,
    ownContractAttempts: ownContracts.length,
    ownContractsMade,
    ownContractRate: ownContracts.length === 0 ? 0 : Math.round((ownContractsMade / ownContracts.length) * 100),
    tricksTeam0: records.reduce((total, record) => total + record.tricksTeam0, 0),
    tricksTeam1: records.reduce((total, record) => total + record.tricksTeam1, 0),
    netScoreTeam0: records.reduce((total, record) => total + record.scoreChange0, 0),
  };
}
