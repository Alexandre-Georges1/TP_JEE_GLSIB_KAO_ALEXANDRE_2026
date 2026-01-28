import { Compte } from './compte.model';

export type TypeTransaction = 'DEPOT' | 'RETRAIT' | 'VIREMENT' | 'VIREMENT_RECU' | 'VIREMENT_EMIS' | 'TRANSFERT' | 'TRANSFER';

// Interface correspondant à l'entité backend
export interface Transaction {
  id?: number | null;
  dateTransaction: string;
  type: TypeTransaction;
  montantAvant: number;
  montantApres: number;
  montant: number;
  
  // Origine des fonds (pour les dépôts)
  origineFonds?: string;
  
  // Relations (optionnelles car @JsonBackReference)
  compte?: Compte;
  
  // Nouveaux champs snapshot
  numeroCompte?: string;
  nomClient?: string;
  
  // Champs utilitaires pour le frontend
  description?: string;
  compteDestination?: string;
}

export interface TransactionFormData {
  compteId: number;
  type: TypeTransaction;
  montant: number;
  compteDestinationId?: number;
  origineFonds?: string;
}
export interface DeposerRetirerRequest {
  montant: number;
  origineFonds?: string;
}
export interface TransfererRequest {
  montant: number;
  id: number;  
}
