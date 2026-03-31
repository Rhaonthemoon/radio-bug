require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const readline = require('readline');

const UserSchema = new mongoose.Schema({
    email: String,
    password: String,
    name: String,
    role: String,
    artistName: String,
    createdAt: Date
});

const User = mongoose.model('User', UserSchema);

function generatePassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
    const bytes = crypto.randomBytes(length);
    return Array.from(bytes)
        .map(b => charset[b % charset.length])
        .join('');
}

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function createAdmin(email) {
    const existing = await User.findOne({ email });

    if (existing) {
        if (existing.role === 'admin') {
            const ans = await ask(`⚠️  "${email}" è già un admin. Sovrascrivere? [s/N] `);
            if (ans.toLowerCase() !== 's') {
                console.log(`   ↳ Saltato.\n`);
                return;
            }
        } else {
            console.log(`ℹ️  "${email}" esiste come "${existing.role}".`);
            const ans = await ask(`   Promuovere ad admin? [s/N] `);
            if (ans.toLowerCase() !== 's') {
                console.log(`   ↳ Saltato.\n`);
                return;
            }
        }
    }

    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.findOneAndUpdate(
        { email },
        {
            email,
            password: hashedPassword,
            name: existing?.name ?? 'Administrator',
            role: 'admin',
            artistName: existing?.artistName,
            createdAt: existing?.createdAt ?? new Date()
        },
        { upsert: true }
    );

    const action = existing
        ? existing.role !== 'admin' ? '🎖️  Promosso' : '♻️  Aggiornato'
        : '✅ Creato';

    console.log(`${action}: ${email}`);
    console.log(`   Password: ${password}\n`);
}

async function main() {
    const emails = process.argv.slice(2);

    if (emails.length === 0) {
        console.error('❌ Nessuna email fornita. Uso: node create-admin.js email1 [email2 ...]');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connesso al DB\n');

    for (const email of emails) {
        await createAdmin(email);
    }

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('Errore:', err);
    process.exit(1);
});