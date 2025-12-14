require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    email: String,
    password: String,
    name: String,
    role: String,
    artistName: String,
    createdAt: Date
});

const User = mongoose.model('User', UserSchema);

async function createAdmin() {
    await mongoose.connect(process.env.MONGODB_URI);

    const adminExists = await User.findOne({ email: 'admin@test.com' });
    if (adminExists) {
        console.log('Admin già esistente!');
        process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    await User.create({
        email: 'admin@test.com',
        password: hashedPassword,
        name: 'Administrator',
        role: 'admin',
        createdAt: new Date()
    });

    console.log('✅ Admin creato!');
    console.log('Email: admin@test.com');
    console.log('Password: admin123');
    process.exit(0);
}

createAdmin();