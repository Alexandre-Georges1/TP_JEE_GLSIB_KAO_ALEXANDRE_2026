import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, combineLatest, tap, catchError, of } from 'rxjs';
import { Compte, CompteFormData, TypeCompte } from '../models/compte.model';
import { ClientService } from './client.service';

@Injectable({
  providedIn: 'root'
})
export class CompteService {
  private comptes$ = new BehaviorSubject<Compte[]>([]);
  private storageKey = 'egabank_comptes';
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/comptes';

  constructor(private clientService: ClientService) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadComptes();
    }
  }

  private loadComptes(): void {
    this.http.get<Compte[]>(this.apiUrl).pipe(
      catchError(() => {
        this.loadFromStorage();
        return of([]);
      })
    ).subscribe(comptes => {
      // Toujours mettre à jour le sujet, même si la liste est vide
      this.comptes$.next(comptes);
      if (comptes.length > 0) {
        this.saveToStorage();
      }
    });
  }

  refreshComptes(): void {
    this.loadComptes();
  }

  private loadFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      const comptes = JSON.parse(stored);
      this.comptes$.next(comptes);
    }
  }

  private saveToStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.storageKey, JSON.stringify(this.comptes$.value));
  }

 

  getComptes(): Observable<Compte[]> {
    return combineLatest([this.comptes$, this.clientService.getClients()]).pipe(
      map(([baseComptes, clients]) => {
        // Optimisation : Créer une map pour rechercher les comptes par numéro rapidement
        // Mais ici on veut surtout trouver le CLIENT pour chaque compte.
        
        return baseComptes.map(compte => {
          // Chercher le client propriétaire de ce compte
          // On suppose que l'objet Client contient une liste 'comptes' avec au moins l'ID ou le numéro
          const proprietaire = clients.find(c => 
            c.comptes && c.comptes.some((compteClient: any) => 
              // Comparaison souple ID ou Numéro
              String(compteClient.id) === String(compte.id) || 
              compteClient.numeroCompte === compte.numeroCompte
            )
          );

          if (proprietaire) {
            return {
              ...compte,
              client: proprietaire,
              clientNom: proprietaire.nom,
              clientPrenom: proprietaire.prenom,
              clientId: proprietaire.id // Ajout pour compatibilité
            };
          }

          // Si pas de propriétaire trouvé (cas orphelin ou données incomplètes)
          return {
            ...compte,
            clientNom: 'Inconnu',
            clientPrenom: 'Client'
          };
        });
      })
    );
  }

  getComptesByClient(clientId: string | number): Observable<Compte[]> {
    const id = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;
    return this.getComptes().pipe(
      map(comptes => comptes.filter(c => {
        const cId = c.client?.id || (c as any).clientId;
        return String(cId) === String(id);
      }))
    );
  }

  getCompteByNumero(numero: string): Observable<Compte | undefined> {
    return this.getComptes().pipe(
      map(comptes => comptes.find(c => c.numeroCompte === numero))
    );
  }

  createCompte(data: CompteFormData): Observable<Compte> {
    const compteData = {
      dateCreation: new Date(),
      typeCompte: data.typeCompte,
      solde: data.solde,
      client: data.client,
      clientId: data.clientId || data.client?.id
    };

    return this.http.post<Compte>(this.apiUrl, compteData).pipe(
      tap(compte => {
        const enrichedCompte: Compte = {
          ...compte,
          client: data.client as any // On s'assure d'avoir l'objet client avec l'ID
        };
        const current = this.comptes$.value;
        this.comptes$.next([...current, enrichedCompte]);
        
        // Mise à jour immédiate du client local pour garantir la cohérence
        if (enrichedCompte.client?.id) {
          this.clientService.addCompteLocal(enrichedCompte.client.id, enrichedCompte);
        }

        this.refreshComptes();
        this.clientService.refreshClients();
        
        this.saveToStorage();
      }),
      catchError(error => {
        console.error('Erreur lors de la création du compte:', error);
        throw error;
      })
    );
  }

  updateSolde(numeroCompte: string, nouveauSolde: number): Observable<boolean> {
    const current = this.comptes$.value;
    const compte = current.find(c => c.numeroCompte === numeroCompte);
    
    if (!compte || !compte.id) return of(false);

    const updatedCompte = { ...compte, solde: nouveauSolde };
    
    return this.http.put<Compte>(`${this.apiUrl}/${compte.id}`, updatedCompte).pipe(
      tap(updated => {
        const index = current.findIndex(c => c.numeroCompte === numeroCompte);
        if (index !== -1) {
          current[index] = updated;
          this.comptes$.next([...current]);
          this.saveToStorage();
        }
      }),
      map(() => true),
      catchError(error => {
        console.error('Erreur lors de la mise à jour du solde:', error);
        // Fallback local
        const index = current.findIndex(c => c.numeroCompte === numeroCompte);
        if (index !== -1) {
          current[index] = { ...current[index], solde: nouveauSolde };
          this.comptes$.next([...current]);
          this.saveToStorage();
          return of(true);
        }
        return of(false);
      })
    );
  }

  deleteCompte(numeroCompte: string): boolean {
    const current = this.comptes$.value;
    const filtered = current.filter(c => c.numeroCompte !== numeroCompte);
    
    if (filtered.length === current.length) return false;

    this.comptes$.next(filtered);
    this.saveToStorage();
    return true;
  }

  deleteComptesByClient(clientId: string): void {
    const current = this.comptes$.value;
    const comptesToDelete = current.filter(c => c.client?.id === parseInt(clientId, 10));
    
    comptesToDelete.forEach(compte => {
      if (compte.id) {
        this.http.delete(`${this.apiUrl}/${compte.id}`).subscribe({
          error: (error) => console.error('Erreur lors de la suppression:', error)
        });
      }
    });
    
    const filtered = current.filter(c => c.client?.id !== parseInt(clientId, 10));
    this.comptes$.next(filtered);
    this.saveToStorage();
  }

  getTotalSolde(): Observable<number> {
    return this.comptes$.pipe(
      map(comptes => comptes.reduce((sum, c) => sum + c.solde, 0))
    );
  }

  getComptesCount(): Observable<{ epargne: number; courant: number; total: number }> {
    return this.comptes$.pipe(
      map(comptes => ({
        epargne: comptes.filter(c => c.typeCompte === 'EPARGNE').length,
        courant: comptes.filter(c => c.typeCompte === 'COURANT').length,
        total: comptes.length
      }))
    );
  }
}
