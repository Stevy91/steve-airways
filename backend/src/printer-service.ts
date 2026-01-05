// Créer un fichier printer-service.ts
import fs from 'fs';
import path from 'path';

export class PrinterService {
  private static instance: PrinterService;
  private isCloud = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  
  private constructor() {}
  
  static getInstance(): PrinterService {
    if (!PrinterService.instance) {
      PrinterService.instance = new PrinterService();
    }
    return PrinterService.instance;
  }
  
  async checkConnection(): Promise<boolean> {
    if (this.isCloud) {
      console.log("⚠️ Mode cloud : impression désactivée");
      return false;
    }
    
    try {
      const { USB } = require('escpos-usb');
      const device = new USB();
      
      return new Promise((resolve) => {
        device.open((error: any) => {
          if (error) {
            console.log("❌ Imprimante non connectée (mode local)");
            resolve(false);
          } else {
            device.close();
            console.log("✅ Imprimante connectée (mode local)");
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.log("⚠️ Module d'impression non disponible");
      return false;
    }
  }
  
  async printReceipt(receiptData: any): Promise<{ success: boolean; message: string; receiptUrl?: string }> {
    if (this.isCloud) {
      // En cloud, sauvegarder le reçu comme PDF/HTML
      return await this.saveReceiptAsPDF(receiptData);
    } else {
      // En local, imprimer normalement
      return await this.printPhysicalReceipt(receiptData);
    }
  }
  
  private async saveReceiptAsPDF(receiptData: any): Promise<{ success: boolean; message: string; receiptUrl?: string }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `receipt-${receiptData.bookingReference}-${timestamp}.html`;
      const receiptDir = path.join(__dirname, '..', 'receipts');
      
      // Créer le dossier s'il n'existe pas
      if (!fs.existsSync(receiptDir)) {
        fs.mkdirSync(receiptDir, { recursive: true });
      }
      
      const filepath = path.join(receiptDir, filename);
      
      // Générer le HTML du reçu
      const htmlContent = this.generateReceiptHTML(receiptData);
      
      fs.writeFileSync(filepath, htmlContent);
      
      console.log(`✅ Reçu sauvegardé: ${filepath}`);
      
      return {
        success: true,
        message: "Reçu sauvegardé (mode cloud)",
        receiptUrl: `/receipts/${filename}`
      };
      
    } catch (error) {
      console.error("❌ Erreur sauvegarde reçu:", error);
      return {
        success: false,
        message: "Erreur sauvegarde reçu"
      };
    }
  }
  
  private generateReceiptHTML(receiptData: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reçu ${receiptData.bookingReference}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .receipt { width: 80mm; margin: 0 auto; }
    .header { text-align: center; font-size: 18px; font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 10px 0; }
    .section { margin-bottom: 10px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">✈️ AGENCE DE VOYAGE ✈️</div>
    <div class="divider"></div>
    
    <div class="section">
      <strong>RÉCUS DE RÉSERVATION</strong><br>
      Référence: ${receiptData.bookingReference}<br>
      Date: ${new Date().toLocaleDateString('fr-FR')}
    </div>
    
    <div class="divider"></div>
    
    <!-- Ajoutez le reste de votre contenu ici -->
    
    <div class="footer">
      Ce reçu a été généré électroniquement<br>
      Conservez-le pour référence
    </div>
  </div>
</body>
</html>`;
  }
  
  private async printPhysicalReceipt(receiptData: any): Promise<{ success: boolean; message: string }> {
    try {
      const escpos = require('escpos');
      const USB = require('escpos-usb');
      
      const device = new USB();
      
      return new Promise((resolve) => {
        device.open((error: any) => {
          if (error) {
            resolve({
              success: false,
              message: "Imprimante non disponible"
            });
            return;
          }
          
          const printer = new escpos.Printer(device);
          
          // Logique d'impression...
          printer
            .encode('UTF-8')
            .align('CT')
            .text('Reçu')
            .cut()
            .close();
            
          resolve({
            success: true,
            message: "Reçu imprimé"
          });
        });
      });
      
    } catch (error) {
      return {
        success: false,
        message: "Erreur impression"
      };
    }
  }
}

// Export singleton
export const printerService = PrinterService.getInstance();