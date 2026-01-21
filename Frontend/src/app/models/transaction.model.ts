import { Compte } from './compte.model';

export type TypeTransaction = 'DEPOT' | 'RETRAIT' | 'VIREMENT' | 'TRANSFERT' | 'TRANSFER';

// Interface correspondant à l'entité backend
export interface Transaction {
  id?: number;
  dateTransaction: Date;
  type: string;
  montantAvant: number;
  montantApres: number;
  montant: number;
  
  // Origine des fonds (pour les dépôts)
  origineFonds?: string;
  
  // Relations (optionnelles car @JsonBackReference)
  compte?: Compte;
  
  // Champs utilitaires pour le frontend ou payload
  numeroCompte?: string;
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
