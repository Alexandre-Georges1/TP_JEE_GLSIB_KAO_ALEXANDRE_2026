package egabank.api.devoir.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import egabank.api.devoir.dto.ReleveDTO;
import egabank.api.devoir.entity.Compte;
import egabank.api.devoir.entity.Transaction;
import egabank.api.devoir.repository.CompteRepository;
import egabank.api.devoir.repository.TransactionRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ReleveService {
    
    private final CompteRepository compteRepository;
    private final TransactionRepository transactionRepository;
    
    public ReleveService(CompteRepository compteRepository, TransactionRepository transactionRepository) {
        this.compteRepository = compteRepository;
        this.transactionRepository = transactionRepository;
    }
    public ReleveDTO obtenirDonneesReleve(Long compteId, LocalDate dateDebut, LocalDate dateFin) {
        Compte compte = compteRepository.findById(compteId)
            .orElseThrow(() -> new RuntimeException("Compte non trouvé"));
        
        LocalDateTime dateDebutTime = dateDebut.atStartOfDay();
        LocalDateTime dateFinTime = dateFin.atTime(23, 59, 59);
        
        List<Transaction> transactions = transactionRepository
            .findByCompteIdAndDateBetween(compteId, dateDebutTime, dateFinTime);
        
        ReleveDTO releve = new ReleveDTO();
        releve.setCompte(compte);
        releve.setTransactions(transactions);
        releve.setDateDebut(dateDebut);
        releve.setDateFin(dateFin);
        releve.setNombreTransactions(transactions.size());
        
        Integer totalCredits = 0;
        Integer totalDebits = 0;
        
        for (Transaction t : transactions) {
            if (t.getType().equals("DEPOT") || t.getType().equals("VIREMENT_RECU")) {
                totalCredits += t.getMontant();
            } else {
                totalDebits += t.getMontant();
            }
        }
        
        releve.setTotalCredits(totalCredits);
        releve.setTotalDebits(totalDebits);
        releve.setSoldeFin(compte.getSolde());
        
        // Calculer le solde de début (solde actuel - mouvements de la période)
        Integer soldeDebut = compte.getSolde() - totalCredits + totalDebits;
        releve.setSoldeDebut(soldeDebut);
        return releve;
    }
    
    public byte[] genererRelevePdf(Long compteId, LocalDate dateDebut, LocalDate dateFin) throws Exception {
        ReleveDTO releve = obtenirDonneesReleve(compteId, dateDebut, dateFin);
        Compte compte = releve.getCompte();
        List<Transaction> transactions = releve.getTransactions();
        
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document document = new Document(pdf);
        
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        
        // En-tête du document
        document.add(new Paragraph("RELEVÉ BANCAIRE")
            .setBold()
            .setFontSize(20)
            .setTextAlignment(TextAlignment.CENTER));
        
        document.add(new Paragraph("EGA BANK")
            .setFontSize(16)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginBottom(20));
        
        // Informations du compte
        document.add(new Paragraph("Informations du compte")
            .setBold()
            .setFontSize(14)
            .setMarginTop(10));
        
        document.add(new Paragraph("Compte N° : " + compte.getNumeroCompte()));
        document.add(new Paragraph("Titulaire : " + compte.getClient().getNom() + " " + 
            compte.getClient().getPrenom()));
        document.add(new Paragraph("Période : du " + dateDebut.format(dateFormatter) + 
            " au " + dateFin.format(dateFormatter)));
        document.add(new Paragraph("\n"));
        
        // Résumé
        document.add(new Paragraph("Résumé de la période")
            .setBold()
            .setFontSize(14));
        
        double soldeDebut = releve.getSoldeDebut() != null ? releve.getSoldeDebut().doubleValue() : 0.0;
        double totalCredits = releve.getTotalCredits() != null ? releve.getTotalCredits().doubleValue() : 0.0;
        double totalDebits = releve.getTotalDebits() != null ? releve.getTotalDebits().doubleValue() : 0.0;
        double soldeFin = releve.getSoldeFin() != null ? releve.getSoldeFin().doubleValue() : 0.0;
        
        document.add(new Paragraph("Solde début de période : " + 
            String.format("%.2f F CFA", soldeDebut)));
        document.add(new Paragraph("Total des crédits : +" + 
            String.format("%.2f F CFA", totalCredits))
            .setFontColor(ColorConstants.GREEN));
        document.add(new Paragraph("Total des débits : -" + 
            String.format("%.2f F CFA", totalDebits))
            .setFontColor(ColorConstants.RED));
        document.add(new Paragraph("Solde fin de période : " + 
            String.format("%.2f F CFA", soldeFin))
            .setBold());
        document.add(new Paragraph("Nombre de transactions : " + releve.getNombreTransactions()));
        document.add(new Paragraph("\n"));
        
        // Tableau des transactions
        if (!transactions.isEmpty()) {
            document.add(new Paragraph("Détail des opérations")
                .setBold()
                .setFontSize(14));
            
            float[] columnWidths = {3, 2, 2};
            Table table = new Table(UnitValue.createPercentArray(columnWidths));
            table.setWidth(UnitValue.createPercentValue(100));
            
            // En-têtes du tableau
            table.addHeaderCell(new Cell().add(new Paragraph("Date").setBold())
                .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                .setTextAlignment(TextAlignment.CENTER));
            table.addHeaderCell(new Cell().add(new Paragraph("Type").setBold())
                .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                .setTextAlignment(TextAlignment.CENTER));
            table.addHeaderCell(new Cell().add(new Paragraph("Montant").setBold())
                .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                .setTextAlignment(TextAlignment.CENTER));
            
            for (Transaction t : transactions) {
                table.addCell(new Cell().add(new Paragraph(
                    t.getDateTransaction().format(dateTimeFormatter)))
                    .setFontSize(9));
                
                table.addCell(new Cell().add(new Paragraph(t.getType()))
                    .setFontSize(9));
                
                boolean isCredit = t.getType().equals("DEPOT") || t.getType().equals("VIREMENT_RECU");
                double montant = t.getMontant() != null ? t.getMontant().doubleValue() : 0.0;
                
                Paragraph montantPara = new Paragraph(
                    (isCredit ? "+" : "-") + String.format("%.2f F CFA", montant))
                    .setFontSize(9)
                    .setTextAlignment(TextAlignment.RIGHT);
                
                if (isCredit) {
                    montantPara.setFontColor(ColorConstants.GREEN);
                } else {
                    montantPara.setFontColor(ColorConstants.RED);
                }
                
                table.addCell(new Cell().add(montantPara));
            }
            
            document.add(table);
        } else {
            document.add(new Paragraph("Aucune transaction pour cette période")
                .setItalic()
                .setTextAlignment(TextAlignment.CENTER));
        }
        document.add(new Paragraph("\n\n"));
        document.add(new Paragraph("Document édité le " + LocalDate.now().format(dateFormatter))
            .setFontSize(8)
            .setTextAlignment(TextAlignment.CENTER)
            .setItalic());
        
        document.close();
        return baos.toByteArray();
    }
}
