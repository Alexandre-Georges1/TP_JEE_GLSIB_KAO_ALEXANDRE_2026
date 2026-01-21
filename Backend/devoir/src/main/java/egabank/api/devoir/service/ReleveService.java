package egabank.api.devoir.service;

import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import egabank.api.devoir.dto.ReleveDTO;
import egabank.api.devoir.entity.Compte;
import egabank.api.devoir.entity.Transaction;
import egabank.api.devoir.repository.CompteRepository;
import egabank.api.devoir.repository.TransactionRepository;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ReleveService {
    
    // Couleurs de la charte graphique EGABANK
    private static final DeviceRgb PRIMARY_COLOR = new DeviceRgb(22, 163, 74);    
    private static final DeviceRgb SECONDARY_COLOR = new DeviceRgb(20, 83, 45);   
    private static final DeviceRgb SUCCESS_COLOR = new DeviceRgb(22, 163, 74);    
    private static final DeviceRgb DANGER_COLOR = new DeviceRgb(220, 38, 38);     
    private static final DeviceRgb GRAY_LIGHT = new DeviceRgb(243, 244, 246);     
    private static final DeviceRgb GRAY_DARK = new DeviceRgb(107, 114, 128);      
    
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
        document.setMargins(40, 40, 40, 40);
        
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        
        // ========== EN-TÊTE AVEC LOGO ==========
        addHeader(document);
        
        // ========== TITRE DU DOCUMENT ==========
        document.add(new Paragraph("RELEVÉ DE COMPTE")
            .setBold()
            .setFontSize(22)
            .setFontColor(SECONDARY_COLOR)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginTop(20)
            .setMarginBottom(5));
        
        document.add(new Paragraph("Période du " + dateDebut.format(dateFormatter) + 
            " au " + dateFin.format(dateFormatter))
            .setFontSize(11)
            .setFontColor(GRAY_DARK)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginBottom(25));
        
        // ========== INFORMATIONS DU COMPTE ==========
        addAccountInfoSection(document, compte);
        
        // ========== RÉSUMÉ FINANCIER ==========
        addFinancialSummary(document, releve);
        
        // ========== TABLEAU DES TRANSACTIONS ==========
        addTransactionsTable(document, transactions, dateTimeFormatter);
        
        // ========== PIED DE PAGE ==========
        addFooter(document, dateFormatter);
        
        document.close();
        return baos.toByteArray();
    }
    
    private void addHeader(Document document) {
        try {
            // Logo centré en haut
            Table logoTable = new Table(1);
            logoTable.setWidth(UnitValue.createPercentValue(100));
            
            Cell logoCell = new Cell().setBorder(Border.NO_BORDER);
            logoCell.setTextAlignment(TextAlignment.CENTER);
            
            try {
                ClassPathResource logoResource = new ClassPathResource("static/logo.png");
                if (logoResource.exists()) {
                    InputStream logoStream = logoResource.getInputStream();
                    byte[] logoBytes = logoStream.readAllBytes();
                    ImageData imageData = ImageDataFactory.create(logoBytes);
                    Image logo = new Image(imageData);
                    logo.setWidth(100);
                    logo.setHeight(100);
                    logo.setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.CENTER);
                    logoCell.add(logo);
                } else {
                    logoCell.add(new Paragraph("EGABANK")
                        .setBold()
                        .setFontSize(32)
                        .setFontColor(PRIMARY_COLOR)
                        .setTextAlignment(TextAlignment.CENTER));
                }
            } catch (Exception e) {
                logoCell.add(new Paragraph("EGABANK")
                    .setBold()
                    .setFontSize(32)
                    .setFontColor(PRIMARY_COLOR)
                    .setTextAlignment(TextAlignment.CENTER));
            }
            logoTable.addCell(logoCell);
            document.add(logoTable);
            
            document.add(new Paragraph("Siège Social: Lomé, Togo | Tél: +228 91 18 12 81 | Email: contact@egabank.tg")
                .setFontSize(9)
                .setFontColor(GRAY_DARK)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(5));
            
            Table separatorLine = new Table(1);
            separatorLine.setWidth(UnitValue.createPercentValue(100));
            separatorLine.addCell(new Cell()
                .setHeight(3)
                .setBackgroundColor(PRIMARY_COLOR)
                .setBorder(Border.NO_BORDER));
            separatorLine.setMarginTop(10);
            document.add(separatorLine);
            
        } catch (Exception e) {
            document.add(new Paragraph("EGABANK")
                .setBold()
                .setFontSize(24)
                .setFontColor(PRIMARY_COLOR)
                .setTextAlignment(TextAlignment.CENTER));
        }
    }
    
    private void addAccountInfoSection(Document document, Compte compte) {
        Table infoBox = new Table(2);
        infoBox.setWidth(UnitValue.createPercentValue(100));
        infoBox.setBackgroundColor(GRAY_LIGHT);
        infoBox.setBorder(new SolidBorder(PRIMARY_COLOR, 1));
        
        Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setPadding(15);
        leftCell.add(new Paragraph("TITULAIRE DU COMPTE")
            .setFontSize(8)
            .setFontColor(GRAY_DARK)
            .setBold());
        leftCell.add(new Paragraph(compte.getClient().getPrenom() + " " + compte.getClient().getNom())
            .setFontSize(12)
            .setBold()
            .setFontColor(SECONDARY_COLOR));
        leftCell.add(new Paragraph(compte.getClient().getAdresse())
            .setFontSize(9)
            .setFontColor(GRAY_DARK));
        infoBox.addCell(leftCell);
        
        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setPadding(15);
        rightCell.add(new Paragraph("NUMÉRO DE COMPTE")
            .setFontSize(8)
            .setFontColor(GRAY_DARK)
            .setBold()
            .setTextAlignment(TextAlignment.RIGHT));
        rightCell.add(new Paragraph(compte.getNumeroCompte())
            .setFontSize(14)
            .setBold()
            .setFontColor(PRIMARY_COLOR)
            .setTextAlignment(TextAlignment.RIGHT));
        rightCell.add(new Paragraph("Type: " + compte.getTypeCompte())
            .setFontSize(9)
            .setFontColor(GRAY_DARK)
            .setTextAlignment(TextAlignment.RIGHT));
        infoBox.addCell(rightCell);
        
        document.add(infoBox);
        document.add(new Paragraph("\n"));
    }
    
    private void addFinancialSummary(Document document, ReleveDTO releve) {
        document.add(new Paragraph("RÉSUMÉ FINANCIER")
            .setBold()
            .setFontSize(12)
            .setFontColor(SECONDARY_COLOR)
            .setMarginBottom(10));
        
        double soldeDebut = releve.getSoldeDebut() != null ? releve.getSoldeDebut().doubleValue() : 0.0;
        double totalCredits = releve.getTotalCredits() != null ? releve.getTotalCredits().doubleValue() : 0.0;
        double totalDebits = releve.getTotalDebits() != null ? releve.getTotalDebits().doubleValue() : 0.0;
        double soldeFin = releve.getSoldeFin() != null ? releve.getSoldeFin().doubleValue() : 0.0;
        
        // Tableau du résumé
        float[] summaryWidths = {1, 1, 1, 1};
        Table summaryTable = new Table(UnitValue.createPercentArray(summaryWidths));
        summaryTable.setWidth(UnitValue.createPercentValue(100));
        
        // Solde début
        Cell cell1 = createSummaryCell("Solde initial", 
            String.format("%,.0f F CFA", soldeDebut), GRAY_DARK);
        summaryTable.addCell(cell1);
        
        // Total crédits
        Cell cell2 = createSummaryCell("Total crédits", 
            String.format("+%,.0f F CFA", totalCredits), SUCCESS_COLOR);
        summaryTable.addCell(cell2);
        
        // Total débits
        Cell cell3 = createSummaryCell("Total débits", 
            String.format("-%,.0f F CFA", totalDebits), DANGER_COLOR);
        summaryTable.addCell(cell3);
        
        // Solde final
        Cell cell4 = createSummaryCell("Solde final", 
            String.format("%,.0f F CFA", soldeFin), PRIMARY_COLOR);
        cell4.setBackgroundColor(new DeviceRgb(240, 253, 244));  // Vert très clair
        summaryTable.addCell(cell4);
        
        document.add(summaryTable);
        
        document.add(new Paragraph("Nombre total de transactions : " + releve.getNombreTransactions())
            .setFontSize(9)
            .setFontColor(GRAY_DARK)
            .setMarginTop(5)
            .setMarginBottom(20));
    }
    
    private Cell createSummaryCell(String label, String value, DeviceRgb valueColor) {
        Cell cell = new Cell()
            .setBorder(new SolidBorder(GRAY_LIGHT, 1))
            .setPadding(10);
        cell.add(new Paragraph(label)
            .setFontSize(8)
            .setFontColor(GRAY_DARK));
        cell.add(new Paragraph(value)
            .setFontSize(11)
            .setBold()
            .setFontColor(valueColor));
        return cell;
    }
    
    private void addTransactionsTable(Document document, List<Transaction> transactions, 
            DateTimeFormatter dateTimeFormatter) {
        
        document.add(new Paragraph("DÉTAIL DES OPÉRATIONS")
            .setBold()
            .setFontSize(12)
            .setFontColor(SECONDARY_COLOR)
            .setMarginBottom(10));
        
        if (!transactions.isEmpty()) {
            float[] columnWidths = {2.5f, 2f, 1.5f, 2f};
            Table table = new Table(UnitValue.createPercentArray(columnWidths));
            table.setWidth(UnitValue.createPercentValue(100));
            
            // En-têtes du tableau
            String[] headers = {"Date & Heure", "Type d'opération", "Référence", "Montant"};
            for (String header : headers) {
                Cell headerCell = new Cell()
                    .add(new Paragraph(header).setBold().setFontSize(9).setFontColor(ColorConstants.WHITE))
                    .setBackgroundColor(SECONDARY_COLOR)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setPadding(8);
                table.addHeaderCell(headerCell);
            }
            
            // Lignes de données
            boolean alternate = false;
            for (Transaction t : transactions) {
                com.itextpdf.kernel.colors.Color bgColor = alternate ? GRAY_LIGHT : ColorConstants.WHITE;
                
                // Date
                table.addCell(new Cell()
                    .add(new Paragraph(t.getDateTransaction().format(dateTimeFormatter)).setFontSize(9))
                    .setBackgroundColor(bgColor)
                    .setPadding(6));
                
                // Type avec icône textuelle
                String typeLabel = getTypeLabel(t.getType());
                table.addCell(new Cell()
                    .add(new Paragraph(typeLabel).setFontSize(9))
                    .setBackgroundColor(bgColor)
                    .setPadding(6));
                
                // Référence
                table.addCell(new Cell()
                    .add(new Paragraph("#" + t.getId()).setFontSize(9).setFontColor(GRAY_DARK))
                    .setBackgroundColor(bgColor)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setPadding(6));
                
                // Montant
                boolean isCredit = t.getType().equals("DEPOT") || t.getType().equals("VIREMENT_RECU");
                double montant = t.getMontant() != null ? t.getMontant().doubleValue() : 0.0;
                String montantStr = (isCredit ? "+" : "-") + String.format("%,.0f F CFA", montant);
                
                table.addCell(new Cell()
                    .add(new Paragraph(montantStr)
                        .setFontSize(9)
                        .setBold()
                        .setFontColor(isCredit ? SUCCESS_COLOR : DANGER_COLOR))
                    .setBackgroundColor(bgColor)
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setPadding(6));
                
                alternate = !alternate;
            }
            
            document.add(table);
        } else {
            // Message si aucune transaction
            Table emptyBox = new Table(1);
            emptyBox.setWidth(UnitValue.createPercentValue(100));
            emptyBox.addCell(new Cell()
                .add(new Paragraph("Aucune transaction pour cette période")
                    .setItalic()
                    .setFontColor(GRAY_DARK)
                    .setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(GRAY_LIGHT)
                .setPadding(20)
                .setBorder(new SolidBorder(GRAY_DARK, 1)));
            document.add(emptyBox);
        }
    }
    
    private String getTypeLabel(String type) {
        switch (type) {
            case "DEPOT":
                return "↓ Dépôt";
            case "RETRAIT":
                return "↑ Retrait";
            case "VIREMENT":
                return "→ Virement émis";
            case "VIREMENT_RECU":
                return "← Virement reçu";
            default:
                return type;
        }
    }
    
    private void addFooter(Document document, DateTimeFormatter dateFormatter) {
        document.add(new Paragraph("\n"));
        
        Table separatorLine = new Table(1);
        separatorLine.setWidth(UnitValue.createPercentValue(100));
        separatorLine.addCell(new Cell()
            .setHeight(1)
            .setBackgroundColor(GRAY_LIGHT)
            .setBorder(Border.NO_BORDER));
        document.add(separatorLine);

        document.add(new Paragraph("Document généré automatiquement le " + 
            LocalDate.now().format(dateFormatter) + " par EGABANK")
            .setFontSize(8)
            .setItalic()
            .setFontColor(GRAY_DARK)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginTop(10));
        
        document.add(new Paragraph("Ce document est un relevé officiel de vos opérations bancaires. " +
            "Pour toute réclamation, veuillez contacter votre agence dans un délai de 30 jours.")
            .setFontSize(7)
            .setFontColor(GRAY_DARK)
            .setTextAlignment(TextAlignment.CENTER));
    }
}