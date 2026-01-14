import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Client } from '../../models/client.model';
import { Compte } from '../../models/compte.model';
import { Transaction } from '../../models/transaction.model';
import { ClientService } from '../../services/client.service';
import { CompteService } from '../../services/compte.service';
import { TransactionService } from '../../services/transaction.service';
import { ReleveService, ReleveData } from '../../services/releve.service';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './client-detail.component.html',
  styleUrl: './client-detail.component.css'
})
export class ClientDetailComponent implements OnInit {
  client: Client | null = null;
  comptes: Compte[] = [];
  transactions: Transaction[] = [];
  selectedCompte: Compte | null = null;
  showDeleteModal = false;
  showDeleteCompteModal = false;
  compteToDelete: Compte | null = null;

  // Fonctionnalités de relevé
  dateDebut: string = '';
  dateFin: string = '';
  releveData: ReleveData | null = null;
  loadingReleve = false;
  releveMessage: { text: string; type: 'success' | 'error' } | null = null;
  showReleveSection = false;
  today = new Date().toISOString();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientService,
    private compteService: CompteService,
    private transactionService: TransactionService,
    private releveService: ReleveService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      this.loadClient(id);
    }
    this.setDefaultDates();
  }

  private setDefaultDates(): void {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    this.dateDebut = this.formatDateForInput(lastMonth);
    this.dateFin = this.formatDateForInput(today);
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  loadClient(id: number): void {
    this.clientService.getClientById(id).subscribe(client => {
      if (client) {
        this.client = client;
        this.loadComptes(id);
      } else {
        this.router.navigate(['/dashboard/clients']);
      }
    });
  }

  loadComptes(clientId: number): void {
    this.compteService.getComptesByClient(String(clientId)).subscribe(comptes => {
      this.comptes = comptes;
      if (comptes.length > 0) {
        this.selectCompte(comptes[0]);
      }
    });
  }

  selectCompte(compte: Compte): void {
    this.selectedCompte = compte;
    this.transactionService.getTransactionsByCompte(compte.numeroCompte).subscribe(txns => {
      this.transactions = txns;
    });
  }

  getAge(dnaissance: Date): number {
    const today = new Date();
    const birth = new Date(dnaissance);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  getTotalSolde(): number {
    return this.comptes.reduce((sum, c) => sum + c.solde, 0);
  }

  confirmDeleteClient(): void {
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.showDeleteCompteModal = false;
    this.compteToDelete = null;
  }

  deleteClient(): void {
    if (this.client) {
      this.comptes.forEach(compte => {
        this.transactionService.deleteTransactionsByCompte(compte.numeroCompte);
      });
      this.compteService.deleteComptesByClient(String(this.client.id));
      this.clientService.deleteClient(this.client.id).subscribe({
        next: () => {
          this.router.navigate(['/dashboard/clients']);
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          this.router.navigate(['/dashboard/clients']);
        }
      });
    }
  }

  confirmDeleteCompte(compte: Compte): void {
    this.compteToDelete = compte;
    this.showDeleteCompteModal = true;
  }

  deleteCompte(): void {
    if (this.compteToDelete) {
      this.transactionService.deleteTransactionsByCompte(this.compteToDelete.numeroCompte);
      this.compteService.deleteCompte(this.compteToDelete.numeroCompte);
      
      if (this.client) {
        this.loadComptes(this.client.id);
      }
      
      this.cancelDelete();
    }
  }

  getTransactionIcon(type: string): string {
    switch (type) {
      case 'DEPOT': return 'fa-arrow-down';
      case 'RETRAIT': return 'fa-arrow-up';
      case 'VIREMENT': return 'fa-exchange-alt';
      default: return 'fa-circle';
    }
  }

  // Fonctionnalités de relevé
  toggleReleveSection(): void {
    this.showReleveSection = !this.showReleveSection;
    if (!this.showReleveSection) {
      this.releveData = null;
      this.releveMessage = null;
    }
  }

  afficherReleve(): void {
    if (!this.selectedCompte || !this.dateDebut || !this.dateFin) {
      this.showReleveMessage('Veuillez sélectionner un compte et remplir les dates', 'error');
      return;
    }

    const compteId = this.selectedCompte.id;
    if (!compteId) {
      this.showReleveMessage('ID du compte non disponible', 'error');
      return;
    }

    if (new Date(this.dateDebut) > new Date(this.dateFin)) {
      this.showReleveMessage('La date de début doit être antérieure à la date de fin', 'error');
      return;
    }

    this.loadingReleve = true;
    this.releveData = null;

    this.releveService.getReleveData(
      compteId,
      this.dateDebut,
      this.dateFin
    ).subscribe({
      next: (data) => {
        this.releveData = data;
        this.showReleveMessage('Relevé chargé avec succès', 'success');
        this.loadingReleve = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du relevé:', error);
        this.showReleveMessage('Erreur lors de la récupération du relevé: ' + error.message, 'error');
        this.loadingReleve = false;
      }
    });
  }

  telechargerPDF(): void {
    if (!this.selectedCompte || !this.dateDebut || !this.dateFin) {
      this.showReleveMessage('Veuillez sélectionner un compte et remplir les dates', 'error');
      return;
    }

    const compteId = this.selectedCompte.id;
    if (!compteId) {
      this.showReleveMessage('ID du compte non disponible', 'error');
      return;
    }

    const url = this.releveService.getRelevePdfUrl(
      compteId,
      this.dateDebut,
      this.dateFin
    );
    this.showReleveMessage('Téléchargement du PDF en cours...', 'success');
    window.open(url, '_blank');
  }

  imprimerReleve(): void {
    window.print();
  }

  private showReleveMessage(text: string, type: 'success' | 'error'): void {
    this.releveMessage = { text, type };
    setTimeout(() => this.releveMessage = null, 5000);
  }

  formatDateDisplay(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatMontantReleve(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant);
  }

  isCredit(type: string): boolean {
    return type === 'DEPOT' || type === 'VIREMENT_RECU';
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'DEPOT': return 'Dépôt';
      case 'RETRAIT': return 'Retrait';
      case 'VIREMENT_RECU': return 'Virement reçu';
      case 'VIREMENT_EMIS': return 'Virement émis';
      case 'VIREMENT': return 'Virement';
      default: return type;
    }
  }
}
