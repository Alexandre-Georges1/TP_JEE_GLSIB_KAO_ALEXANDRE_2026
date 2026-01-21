import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { Subscription, switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './client-detail.component.html',
  styleUrl: './client-detail.component.css'
})
export class ClientDetailComponent implements OnInit, OnDestroy {
  client: Client | null = null;
  comptes: Compte[] = [];
  transactions: Transaction[] = [];
  selectedCompte: Compte | null = null;
  showDeleteModal = false;
  showDeleteCompteModal = false;
  compteToDelete: Compte | null = null;
  
  private subscriptions = new Subscription();

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
    this.setDefaultDates();
    
    // Abonnement aux changements d'ID dans l'URL
    this.subscriptions.add(
      this.route.paramMap.pipe(
        switchMap(params => {
          const idParam = params.get('id');
          if (!idParam) return [];
          const id = parseInt(idParam, 10);
          
          // INITIE LA RÉCUPÉRATION DU CLIENT
          // On souscrit séparément pour éviter de bloquer l'un par l'autre
          this.subscribeToClient(id);
          this.subscribeToComptes(id);
          
          return [];
        })
      ).subscribe()
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private subscribeToClient(id: number): void {
    // Si une souscription existe déjà pour le client, on pourrait vouloir la nettoyer, 
    // mais ici on ajoute à la liste globale.
    this.subscriptions.add(
      this.clientService.getClientById(id).subscribe(client => {
        if (client) {
          this.client = client;
        } else {
          // Si on ne trouve pas le client, c'est peut-être qu'il n'est pas encore chargé ou n'existe pas
          // On évite de rediriger trop vite si c'est juste un délai de chargement initial
        }
      })
    );
  }

  private subscribeToComptes(clientId: number): void {
    this.subscriptions.add(
      this.compteService.getComptesByClient(String(clientId)).subscribe(comptes => {
        this.comptes = comptes;
        // Sélectionner le premier compte par défaut si aucun n'est sélectionné ou si la liste change
        if (comptes.length > 0 && !this.selectedCompte) {
          this.selectCompte(comptes[0]);
        } else if (comptes.length > 0 && this.selectedCompte) {
            // Vérifier si le compte sélectionné existe toujours
            const exists = comptes.find(c => c.numeroCompte === this.selectedCompte?.numeroCompte);
            if (!exists) {
                this.selectCompte(comptes[0]);
            } else {
                // Mettre à jour les données du compte sélectionné (ex: solde)
                this.selectedCompte = exists;
            }
        }
      })
    );
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

  // loadClient et loadComptes ne sont plus nécessaires sous cette forme, mais on garde la structure propre
  // On supprime les anciennes méthodes pour éviter la confusion

  selectCompte(compte: Compte): void {
    this.selectedCompte = compte;
    this.subscriptions.add(
      this.transactionService.getTransactionsByCompte(compte.numeroCompte).subscribe(txns => {
        this.transactions = txns;
      })
    );
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
        // La mise à jour est automatique via l'observable
      }
      
      this.cancelDelete();
    }
  }

  getTransactionIcon(type: string): string {
    switch (type) {
      case 'DEPOT': return 'fa-arrow-down';
      case 'RETRAIT': return 'fa-arrow-up';
      case 'VIREMENT': 
      case 'TRANSFERT':
      case 'TRANSFER':
      case 'VIREMENT_EMIS':
      case 'VIREMENT_RECU': return 'fa-exchange-alt';
      default: return 'fa-circle';
    }
  }

  getTransactionDescription(txn: any): string {
    const numCompte = txn.numeroCompte || this.selectedCompte?.numeroCompte || '????';
    
    switch (txn.type) {
      case 'DEPOT':
        return `Dépôt sur le compte ${numCompte}`;
      case 'RETRAIT':
        return `Retrait du compte ${numCompte}`;
      case 'VIREMENT':
      case 'TRANSFERT':
      case 'TRANSFER':
      case 'VIREMENT_EMIS':
      case 'VIREMENT_RECU':
        return `Virement vers ${txn.compteDestination || 'un autre compte'}`;
      default:
        return `${txn.type} sur compte ${numCompte}`;
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

    this.showReleveMessage('Téléchargement du PDF en cours...', 'success');
    
    this.releveService.downloadRelevePdf(
      compteId,
      this.dateDebut,
      this.dateFin
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `releve_${compteId}_${this.dateFin}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.showReleveMessage('Téléchargement terminé', 'success');
      },
      error: (error) => {
        console.error('Erreur lors du téléchargement:', error);
        this.showReleveMessage('Erreur lors du téléchargement du PDF', 'error');
      }
    });
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

  getTransactionLabel(type: string): string {
    switch (type) {
      case 'DEPOT': return 'Dépôt';
      case 'RETRAIT': return 'Retrait';
      case 'VIREMENT': return 'Virement';
      case 'VIREMENT_RECU': return 'Virement Reçu';
      case 'VIREMENT_EMIS': return 'Virement Émis';
      case 'TRANSFERT': return 'Transfert';
      default: return type;
    }
  }
}
