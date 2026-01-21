import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Client } from '../../models/client.model';
import { Transaction } from '../../models/transaction.model';
import { ClientService } from '../../services/client.service';
import { Compte } from '../../models/compte.model';
import { CompteService } from '../../services/compte.service';
import { TransactionService } from '../../services/transaction.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats = {
    totalClients: 0,
    totalComptes: 0,
    comptesEpargne: 0,
    comptesCourant: 0,
    soldeTotal: 0,
    totalTransactions: 0
  };

  recentTransactions: Transaction[] = [];
  recentClients: Client[] = [];
  comptes: Compte[] = [];
  private subscriptions = new Subscription();

  constructor(
    private clientService: ClientService,
    private compteService: CompteService,
    private transactionService: TransactionService
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadRecentData();
    this.loadComptes();
  }

  loadComptes(): void {
    this.subscriptions.add(
      this.compteService.getComptes().subscribe((comptes: Compte[]) => {
        this.comptes = comptes;
      })
    );
  }

  loadStats(): void {
    this.subscriptions.add(
      this.clientService.getClients().subscribe(clients => {
        this.stats.totalClients = clients.length;
        this.recentClients = clients.slice(-5).reverse();
      })
    );

    this.subscriptions.add(
      this.compteService.getComptesCount().subscribe((counts: any) => {
        this.stats.totalComptes = counts.total;
        this.stats.comptesEpargne = counts.epargne;
        this.stats.comptesCourant = counts.courant;
      })
    );

    this.subscriptions.add(
      this.compteService.getTotalSolde().subscribe((solde: number) => {
        this.stats.soldeTotal = solde;
      })
    );

    this.subscriptions.add(
      this.transactionService.getTransactions().subscribe(txns => {
        this.stats.totalTransactions = txns.length;
      })
    );
  }

  loadRecentData(): void {
    this.subscriptions.add(
      this.transactionService.getRecentTransactions(5).subscribe(txns => {
        this.recentTransactions = txns;
      })
    );
  }

  getTransactionIcon(type: string): string {
    switch (type) {
      case 'DEPOT': return 'fa-arrow-down';
      case 'RETRAIT': return 'fa-arrow-up';
      case 'VIREMENT': return 'fa-exchange-alt';
      default: return 'fa-circle';
    }
  }

  getCompteInfo(numeroCompte: string): Compte | undefined {
    return this.comptes.find(c => c.numeroCompte === numeroCompte);
  }

  getTransactionDescription(txn: Transaction): string {
    const compte = this.getCompteInfo(txn.numeroCompte || '');
    const clientName = compte ? `${compte.clientPrenom} ${compte.clientNom}` : 'Inconnu';
    const numCompte = txn.numeroCompte || '????';

    switch (txn.type) {
      case 'DEPOT':
        return `Dépôt sur le compte ${numCompte} (${clientName})`;
      case 'RETRAIT':
        return `Retrait du compte ${numCompte} (${clientName})`;
      case 'VIREMENT':
      case 'TRANSFERT':
        const dest = this.getCompteInfo(txn.compteDestination || '');
        const destName = dest ? `${dest.clientPrenom} ${dest.clientNom}` : 'Inconnu';
        return `Virement de ${numCompte} (${clientName}) vers ${txn.compteDestination || '????'} (${destName})`;
      default:
        return `${txn.type} sur compte ${numCompte}`;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
