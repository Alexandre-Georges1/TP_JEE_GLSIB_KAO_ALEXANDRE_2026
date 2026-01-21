import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CompteService } from '../../services/compte.service';
import { ClientService } from '../../services/client.service';
import { TransactionService } from '../../services/transaction.service';
import { Compte } from '../../models/compte.model';
import { Client } from '../../models/client.model';
import { Transaction } from '../../models/transaction.model';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.css'
})
export class ClientDashboardComponent implements OnInit {
  compte = signal<Compte | null>(null);
  transactions = signal<Transaction[]>([]);
  allClientComptes = signal<Compte[]>([]);
  clientDetails = signal<Client | null>(null);

  userName = computed(() => {
    const user = this.authService.currentUser;
    const currentCompte = this.compte();
    const details = this.clientDetails();
    
    // 1. Si on a le client complet chargé explicitement
    if (details?.prenom && details?.nom) {
      return `${details.prenom} ${details.nom}`;
    }

    // 2. Si le compte contient les infos (enrichi par CompteService)
    if (currentCompte?.clientPrenom && currentCompte?.clientNom) {
      return `${currentCompte.clientPrenom} ${currentCompte.clientNom}`;
    }
    
    // 3. Fallback sur l'utilisateur connecté
    if (user?.prenom && user?.nom) {
      return `${user.prenom} ${user.nom}`;
    }

    return 'Client';
  });

  constructor(
    public authService: AuthService,
    private compteService: CompteService,
    private clientService: ClientService,
    private transactionService: TransactionService
  ) {}

  ngOnInit(): void {
    this.loadClientData();
  }

  private loadClientData(): void {
    const user = this.authService.currentUser;
    if (user) {
      const clientId = this.authService.getNumericClientId;
      if (clientId) {
        this.clientService.getClient(clientId).subscribe({
          next: (client) => {
            if (client) this.clientDetails.set(client);
          },
          error: (err) => console.log('Impossible de charger les détails du client', err)
        });

        this.compteService.getComptesByClient(clientId).subscribe(comptes => {
          this.allClientComptes.set(comptes);
          
          if (!this.compte() && comptes.length > 0) {
            const principal = user.numeroCompte 
              ? comptes.find(c => c.numeroCompte === user.numeroCompte) || comptes[0]
              : comptes[0];
            this.setCompteAndLoadTransactions(principal);
          }
        });
      }

      if (user.numeroCompte && !user.clientId) {
         // Fallback si on a que le numéro de compte
        this.compteService.getCompteByNumero(user.numeroCompte).subscribe(compte => {
          if (compte) {
            this.setCompteAndLoadTransactions(compte);
          }
        });
      }
    }
  }

  private setCompteAndLoadTransactions(compte: Compte): void {
    this.compte.set(compte);
    // On s'assure de recharger les transactions fraîches pour ce compte
    this.transactionService.getTransactions().subscribe(allTransactions => {
      const clientTransactions = allTransactions.filter((t: Transaction) => 
        (t.numeroCompte === compte.numeroCompte) || 
        (t.compteDestination === compte.numeroCompte)
      );
      
      this.transactions.set(
        clientTransactions
          .sort((a, b) => new Date(b.dateTransaction).getTime() - new Date(a.dateTransaction).getTime())
          .slice(0, 10)
      );
    });
  }

  getTransactionSign(transaction: Transaction): string {
    if (transaction.type === 'DEPOT') return '+';
    if (transaction.type === 'RETRAIT') return '-';
    if (transaction.type === 'VIREMENT') {
      return transaction.numeroCompte === this.compte()?.numeroCompte ? '-' : '+';
    }
    return '';
  }

  getTransactionClass(transaction: Transaction): string {
    if (transaction.type === 'DEPOT') return 'credit';
    if (transaction.type === 'RETRAIT') return 'debit';
    if (transaction.type === 'VIREMENT') {
      return transaction.numeroCompte === this.compte()?.numeroCompte ? 'debit' : 'credit';
    }
    return '';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(montant);
  }

  logout(): void {
    this.authService.logout();
  }
}
