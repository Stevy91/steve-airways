
import dotenv from "dotenv";
dotenv.config();


const mysql = require('mysql2/promise');

async function testConnection() {
    
  try {
    console.log('🔄 Tentative de connexion...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER, 
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      connectTimeout: 10000
    });

    console.log('✅ Connexion réussie à MySQL!');
    
    const [result] = await connection.execute(
      'SELECT USER() as user, @@hostname as host, DATABASE() as database, VERSION() as version'
    );
    
    console.log('📊 Informations de connexion:');
    console.log('👤 Utilisateur:', result[0].user);
    console.log('🏠 Hostname de la DB:', result[0].host);
    console.log('🗄️ Base de données:', result[0].database);
    console.log('🔢 Version MySQL:', result[0].version);
    
    await connection.end();
    console.log('🎯 Test terminé avec succès!');
    
  } catch (error) {
    // CORRECTION TYPESCRIPT ICI ✅
    if (error instanceof Error) {
      console.error('❌ ERREUR DE CONNEXION:');
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      
      // Gestion des erreurs MySQL spécifiques
      if ('code' in error) {
        console.error('Code:', (error as any).code);
        
        switch ((error as any).code) {
          case 'ER_ACCESS_DENIED_ERROR':
            console.log('🔐 Problème d\'identifiants - Vérifiez user/mot de passe');
            break;
          case 'ETIMEDOUT':
            console.log('⏰ Timeout - Vérifiez le hostname et le firewall');
            break;
          case 'ENOTFOUND':
            console.log('🌐 Host non trouvé - DB_HOST incorrect');
            break;
          case 'ER_DBACCESS_DENIED_ERROR':
            console.log('🚫 Accès à la base refusé - Vérifiez les permissions');
            break;
        }
      }
    } else {
      console.error('❌ Erreur inconnue:', error);
    }
  }
}


// Version avec type casting :


// Exécuter le test
testConnection();
