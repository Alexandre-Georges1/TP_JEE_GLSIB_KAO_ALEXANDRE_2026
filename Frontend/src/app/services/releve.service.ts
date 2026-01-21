import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, map, switchMap, forkJoin } from 'rxjs';
import { CompteService } from './compte.service';
import { TransactionService } from './transaction.service';

export interface ReleveData {
  compte: {
    numeroCompte: string;
    client: {
      nom: string;
      prenom: string;
    };
    solde: number;
  };
  dateDebut: string;
  dateFin: string;
  nombreTransactions: number;
  soldeDebut: number;
  soldeFin: number;
  totalCredits: number;
  totalDebits: number;
  transactions: ReleveTransaction[];
}

export interface ReleveTransaction {
  id: number;
  dateTransaction: string;
  type: string;
  description?: string;
  montant: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReleveService {
  private http = inject(HttpClient);
  private compteService = inject(CompteService);
  private transactionService = inject(TransactionService);
  private apiUrl = 'http://localhost:8081';

  // Méthode par ID de compte - génère localement (plus rapide et fiable)
  getReleveData(compteId: number, dateDebut: string, dateFin: string): Observable<ReleveData> {
    return this.generateReleveLocallyById(compteId, dateDebut, dateFin);
  }

  // Méthode par numéro de compte
  getReleveByNumeroCompte(numeroCompte: string, dateDebut: string, dateFin: string): Observable<ReleveData> {
    return this.generateReleveLocallyByNumero(numeroCompte, dateDebut, dateFin);
  }

  // Génération locale par ID
  private generateReleveLocallyById(compteId: number, dateDebut: string, dateFin: string): Observable<ReleveData> {
    return this.compteService.getComptes().pipe(
      switchMap(comptes => {
        const compte = comptes.find(c => c.id === compteId);
        if (!compte) {
          throw new Error('Compte non trouvé avec ID: ' + compteId);
        }
        return this.generateReleveForCompte(compte, dateDebut, dateFin);
      })
    );
  }

  // Génération locale par numéro de compte
  private generateReleveLocallyByNumero(numeroCompte: string, dateDebut: string, dateFin: string): Observable<ReleveData> {
    return this.compteService.getComptes().pipe(
      switchMap(comptes => {
        const compte = comptes.find(c => c.numeroCompte === numeroCompte);
        if (!compte) {
          throw new Error('Compte non trouvé avec numéro: ' + numeroCompte);
        }
        return this.generateReleveForCompte(compte, dateDebut, dateFin);
      })
    );
  }

  // Génération du relevé pour un compte donné
  private generateReleveForCompte(compte: any, dateDebut: string, dateFin: string): Observable<ReleveData> {
    return this.transactionService.getTransactionsByCompte(compte.numeroCompte).pipe(
      map(allTransactions => {
        const debut = new Date(dateDebut);
        const fin = new Date(dateFin);
        fin.setHours(23, 59, 59, 999);

        // Filtrer les transactions par période
        const transactions = allTransactions.filter(t => {
          const txnDate = new Date(t.dateTransaction);
          return txnDate >= debut && txnDate <= fin;
        });

        // Calculer les totaux
        let totalCredits = 0;
        let totalDebits = 0;

        const releveTransactions: ReleveTransaction[] = transactions.map(t => {
          const isCredit = t.type === 'DEPOT' || t.type === 'VIREMENT_RECU' || 
                          (t.type === 'VIREMENT' && t.compteDestination === compte.numeroCompte);
          
          if (isCredit) {
            totalCredits += t.montant;
          } else {
            totalDebits += t.montant;
          }

          return {
            id: t.id || Date.now(),
            dateTransaction: t.dateTransaction.toString(),
            type: t.type,
            description: t.description,
            montant: t.montant
          };
        });

        // Calculer le solde de début (solde actuel - transactions de la période)
        const soldeDebut = compte.solde - totalCredits + totalDebits;
        const soldeFin = compte.solde;

        const releveData: ReleveData = {
          compte: {
            numeroCompte: compte.numeroCompte,
            client: {
              nom: compte.clientNom || compte.client?.nom || 'N/A',
              prenom: compte.clientPrenom || compte.client?.prenom || ''
            },
            solde: compte.solde
          },
          dateDebut: dateDebut,
          dateFin: dateFin,
          nombreTransactions: transactions.length,
          soldeDebut: soldeDebut,
          soldeFin: soldeFin,
          totalCredits: totalCredits,
          totalDebits: totalDebits,
          transactions: releveTransactions
        };

        return releveData;
      })
    );
  }

  getRelevePdfUrl(compteId: number, dateDebut: string, dateFin: string): string {
    return `${this.apiUrl}/api/releves/compte/${compteId}/pdf?dateDebut=${dateDebut}&dateFin=${dateFin}`;
  }

  downloadRelevePdf(compteId: number, dateDebut: string, dateFin: string): Observable<Blob> {
    const url = this.getRelevePdfUrl(compteId, dateDebut, dateFin);
    return this.http.get(url, { responseType: 'blob' });
  }
}
