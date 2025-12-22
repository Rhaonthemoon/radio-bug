// Carica .env dalla root del progetto (parent directory)
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

/**
 * Script per aggiornare utenti esistenti dopo l'introduzione di emailVerified
 * Setta emailVerified=true per tutti gli utenti esistenti
 */

async function updateExistingUsers() {
    try {
        // Verifica che MONGODB_URI sia definito
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI non trovato nel file .env');
            console.log('\n📝 Il file .env deve contenere:');
            console.log('   MONGODB_URI=mongodb://...');
            console.log('\n💡 Oppure passa la connection string come parametro:');
            console.log('   node update-existing-users.js "mongodb://localhost:27017/bug-radio"\n');
            process.exit(1);
        }

        console.log('🔄 Connessione al database...');
        console.log('📍 MongoDB URI:', process.env.MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'));

        // Connetti al database
        await mongoose.connect(process.env.MONGODB_URI);

        console.log('✅ Connesso al database\n');

        // Trova tutti gli utenti senza emailVerified o con emailVerified=false
        const usersToUpdate = await User.find({
            $or: [
                { emailVerified: { $exists: false } },
                { emailVerified: false }
            ]
        });

        console.log(`📊 Trovati ${usersToUpdate.length} utenti da aggiornare\n`);

        if (usersToUpdate.length === 0) {
            console.log('✅ Tutti gli utenti sono già verificati!');
            await mongoose.connection.close();
            process.exit(0);
        }

        // Aggiorna tutti gli utenti
        for (const user of usersToUpdate) {
            user.emailVerified = true;
            await user.save();
            console.log(`✅ Aggiornato: ${user.email} (${user.role})`);
        }

        console.log(`\n🎉 Completato! ${usersToUpdate.length} utenti aggiornati.`);
        console.log('✅ Ora tutti possono fare login normalmente.\n');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Errore:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

// Permetti di passare MongoDB URI come parametro
if (process.argv[2]) {
    process.env.MONGODB_URI = process.argv[2];
}

// Esegui lo script
updateExistingUsers();