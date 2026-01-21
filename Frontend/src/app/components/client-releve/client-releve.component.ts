import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CompteService } from '../../services/compte.service';
import { ReleveService, ReleveData, ReleveTransaction } from '../../services/releve.service';
import { Compte } from '../../models/compte.model';

@Component({
  selector: 'app-client-releve',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './client-releve.component.html',
  styleUrl: './client-releve.component.css'
})
export class ClientReleveComponent implements OnInit {
  comptes = signal<Compte[]>([]);
  selectedCompteId = signal<number | null>(null);
  dateDebut = signal<string>('');
  dateFin = signal<string>('');
  
  releveData = signal<ReleveData | null>(null);
  loading = signal<boolean>(false);
  message = signal<{ text: string; type: 'success' | 'error' } | null>(null);
  today = new Date().toISOString();
  
  selectedCompte = computed(() => {
    const id = this.selectedCompteId();
    return this.comptes().find(c => c.id === id) || null;
  });

  constructor(
    public authService: AuthService,
    private compteService: CompteService,
    private releveService: ReleveService
  ) {}

  ngOnInit(): void {
    this.loadComptes();
    this.setDefaultDates();
  }

  private loadComptes(): void {
    const user = this.authService.currentUser;
    if (!user) return;

    // 1. Essayer de charger par clientId pour avoir tous les comptes
    const clientId = this.authService.getNumericClientId;
    if (clientId) {
      this.compteService.getComptesByClient(clientId).subscribe(comptes => {
        this.comptes.set(comptes);
        
        // Sélectionner le compte qui correspond au numéro du jeton (compte actuel)
        if (comptes.length > 0 && !this.selectedCompteId()) {
          const currentAccount = user.numeroCompte 
            ? comptes.find(c => c.numeroCompte === user.numeroCompte) || comptes[0]
            : comptes[0];
          
          if (currentAccount.id) {
            this.selectedCompteId.set(currentAccount.id);
          }
        }
      });
    }

    // 2. Fallback: Charger spécifiquement le compte actuel par son numéro
    if (user.numeroCompte) {
      this.compteService.getCompteByNumero(user.numeroCompte).subscribe(compte => {
        if (compte) {
          // Ajouter à la liste si pas déjà présent
          const currentComptes = this.comptes();
          if (!currentComptes.find(c => c.numeroCompte === compte.numeroCompte)) {
            this.comptes.set([...currentComptes, compte]);
          }
          // Définir comme sélectionné s'il n'y en a pas encore
          if (compte.id && !this.selectedCompteId()) {
            this.selectedCompteId.set(compte.id);
          }
        }
      });
    }
  }

  private setDefaultDates(): void {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    this.dateDebut.set(this.formatDateForInput(lastMonth));
    this.dateFin.set(this.formatDateForInput(today));
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  afficherReleve(): void {
    if (!this.selectedCompteId() || !this.dateDebut() || !this.dateFin()) {
      this.showMessage('Veuillez remplir tous les champs', 'error');
      return;
    }

    if (new Date(this.dateDebut()) > new Date(this.dateFin())) {
      this.showMessage('La date de début doit être antérieure à la date de fin', 'error');
      return;
    }

    this.loading.set(true);
    this.releveData.set(null);

    this.releveService.getReleveData(
      this.selectedCompteId()!,
      this.dateDebut(),
      this.dateFin()
    ).subscribe({
      next: (data) => {
        this.releveData.set(data);
        this.showMessage('Relevé chargé avec succès', 'success');
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.showMessage('Erreur lors de la récupération du relevé: ' + error.message, 'error');
        this.loading.set(false);
      }
    });
  }

  telechargerPDF(): void {
    if (!this.selectedCompteId() || !this.dateDebut() || !this.dateFin()) {
      this.showMessage('Veuillez remplir tous les champs', 'error');
      return;
    }

    this.loading.set(true);
    this.showMessage('Préparation du PDF...', 'success');

    this.releveService.downloadRelevePdf(
      this.selectedCompteId()!,
      this.dateDebut(),
      this.dateFin()
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `releve_${this.selectedCompte()?.numeroCompte}_${this.dateDebut()}_${this.dateFin()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.showMessage('Téléchargement réussi', 'success');
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur PDF:', error);
        this.showMessage('Erreur lors du téléchargement du PDF', 'error');
        this.loading.set(false);
      }
    });
  }

  imprimerReleve(): void {
    window.print();
  }

  private showMessage(text: string, type: 'success' | 'error'): void {
    this.message.set({ text, type });
    setTimeout(() => this.message.set(null), 5000);
  }

  formatDate(dateString: string): string {
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

  formatMontant(montant: number): string {
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

  logout(): void {
    this.authService.logout();
  }
}
