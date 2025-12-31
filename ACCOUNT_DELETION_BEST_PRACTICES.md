# 🔒 Boas Práticas para Exclusão de Contas - GoandBuy

## 📋 Resumo Executivo
Para compliance com LGPD/GDPR e auditoria, implementamos **soft delete** com retenção seletiva de dados.

## 🎯 Estratégia de Exclusão

### 1. **SOFT DELETE (Recomendado)**
```javascript
// ❌ EVITAR: Exclusão permanente
await User.findByIdAndDelete(userId);

// ✅ FAZER: Soft delete com auditoria
await User.findByIdAndUpdate(userId, {
  // Marcadores de exclusão
  isDeleted: true,
  deletedAt: new Date(),
  deletionReason: 'user_request',
  
  // Backup para auditoria (LGPD compliance)
  emailBackup: user.email,
  nameBackup: user.name,
  
  // Anonimização de dados pessoais
  email: `deleted_${Date.now()}@anonymized.local`,
  name: 'Usuário Anônimo',
  phone: null,
  profileImage: null,
  
  // Desativação
  isActive: false,
  
  // Período de carência (30 dias para reativação)
  canReactivateUntil: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
});
```

### 2. **RETENÇÃO LEGAL OBRIGATÓRIA**
```javascript
// MANTER por 5-10 anos (Lei fiscal/comercial)
const legalRetentionData = {
  transactionHistory: true,     // Histórico de transações
  orderHistory: true,          // Histórico de pedidos
  paymentRecords: true,        // Registros de pagamento
  taxDocuments: true,          // Documentos fiscais
  disputeRecords: true,        // Registros de disputas
  refundHistory: true,         // Histórico de reembolsos
  auditTrail: true            // Rastro de auditoria
};

// ANONIMIZAR dados pessoais
const anonymizedFields = {
  name: 'Usuário Anônimo',
  email: 'anonymous@deleted.local',
  phone: null,
  address: 'Endereço Removido',
  personalDocuments: null
};
```

### 3. **LOG DE AUDITORIA COMPLETO**
```javascript
const auditLog = {
  action: 'ACCOUNT_DELETION_REQUEST',
  userId: userId,
  userEmail: user.email,
  userName: user.name,
  timestamp: new Date(),
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  
  // Motivo da exclusão
  reason: 'user_request', // ou 'admin_action', 'compliance', etc.
  
  // Dados retidos para compliance
  retainedData: [
    'transaction_history',
    'order_history', 
    'payment_records',
    'tax_documents',
    'audit_trail'
  ],
  
  // Dados anonimizados
  anonymizedData: [
    'personal_info',
    'contact_details',
    'profile_data'
  ],
  
  // Período de retenção
  retentionPeriod: '10_years',
  canReactivateUntil: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)),
  
  // Compliance
  lgpdCompliant: true,
  gdprCompliant: true
};

// Salvar log em coleção separada para auditoria
await AuditLog.create(auditLog);
```

## 🔄 Implementação Recomendada

### Backend Route (Melhorada):
```javascript
router.delete('/delete-account', async (req, res) => {
  try {
    const { userId, reason = 'user_request' } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // 1. CRIAR LOG DE AUDITORIA
    await AuditLog.create({
      action: 'ACCOUNT_DELETION_REQUEST',
      userId: userId,
      userEmail: user.email,
      timestamp: new Date(),
      reason: reason,
      ipAddress: req.ip
    });

    // 2. SOFT DELETE com anonimização
    await User.findByIdAndUpdate(userId, {
      isDeleted: true,
      deletedAt: new Date(),
      deletionReason: reason,
      
      // Backup para auditoria
      emailBackup: user.email,
      nameBackup: user.name,
      
      // Anonimização
      email: `deleted_${Date.now()}@anonymized.local`,
      name: 'Usuário Anônimo',
      phone: null,
      profileImage: null,
      isActive: false,
      
      // Período de carência
      canReactivateUntil: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
    });

    // 3. ANONIMIZAR dados relacionados (mas manter para auditoria)
    await Cart.updateMany(
      { userId: userId },
      { $set: { userDeleted: true, anonymized: true } }
    );
    
    await Order.updateMany(
      { userId: userId },
      { $set: { userDeleted: true, anonymized: true } }
    );

    console.log(`[AUDIT] Conta soft-deleted: ${user.email} | Reason: ${reason}`);
    
    res.json({ 
      message: 'Conta desativada com sucesso',
      reactivationPeriod: '30 dias',
      dataRetention: 'Dados de transação mantidos por questões legais'
    });

  } catch (err) {
    console.error('[AUTH] ❌ Erro ao deletar conta:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
```

## 📊 Benefícios da Abordagem:

### ✅ **Compliance Legal:**
- **LGPD/GDPR**: Direito ao esquecimento respeitado
- **Auditoria**: Rastro completo de ações
- **Retenção**: Dados fiscais/legais mantidos conforme lei

### ✅ **Segurança e Integridade:**
- **Soft Delete**: Dados não perdidos acidentalmente
- **Anonimização**: Privacidade garantida
- **Reativação**: Usuário pode voltar em 30 dias

### ✅ **Operacional:**
- **Relatórios**: Histórico preservado para análises
- **Debugging**: Dados disponíveis para investigação
- **Analytics**: Métricas de retenção/churn

## 🚨 NUNCA Fazer:
- ❌ Exclusão permanente sem auditoria
- ❌ Deletar dados de transação
- ❌ Remover logs de sistema
- ❌ Ignorar período de carência
- ❌ Não anonimizar dados pessoais

## 📅 Cronograma de Limpeza:
- **Imediato**: Anonimização de dados pessoais
- **30 dias**: Remoção de possibilidade de reativação
- **1 ano**: Limpeza de dados não-essenciais
- **10 anos**: Arquivamento de dados legais