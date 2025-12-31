// Script para adicionar campos de soft delete aos usuários existentes
const mongoose = require('mongoose');
require('dotenv').config();

async function updateExistingUsers() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goandbuy');
    console.log('✅ Conectado ao MongoDB');

    // Atualizar todos os usuários existentes com os novos campos
    const result = await mongoose.connection.db.collection('users').updateMany(
      { 
        $or: [
          { isDeleted: { $exists: false } },
          { deletedAt: { $exists: false } },
          { deletionReason: { $exists: false } }
        ]
      },
      { 
        $set: { 
          isDeleted: false,
          deletedAt: null,
          deletionReason: null
        } 
      }
    );

    console.log(`✅ Atualizados ${result.modifiedCount} usuários com campos de soft delete`);
    
    // Verificar quantos usuários temos no total
    const totalUsers = await mongoose.connection.db.collection('users').countDocuments();
    console.log(`📊 Total de usuários no banco: ${totalUsers}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao atualizar usuários:', error);
    process.exit(1);
  }
}

updateExistingUsers();