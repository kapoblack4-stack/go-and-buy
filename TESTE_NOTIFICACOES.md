# 🔔 Guia de Teste - Sistema de Notificações Push (DIAGNÓSTICO MELHORADO)

## 🆘 PROBLEMA IDENTIFICADO: Backend envia, mas pop-ups não aparecem

### 📊 **Status Atual:**
- ✅ Backend funcionando (4 notificações enviadas com sucesso)
- ✅ API respondendo corretamente (Status 200)
- ❌ Pop-ups não aparecem nos dispositivos dos compradores

## 🔍 **DIAGNÓSTICO MELHORADO**

### 1️⃣ **Verificação de Tokens**
Agora o sistema verifica se os tokens são válidos:
```
[TEST-BROADCAST] 📱 Compradores com tokens válidos: X
[TEST-BROADCAST] ❌ Compradores sem tokens: Y
```

### 2️⃣ **Logs Detalhados da Expo**
O backend agora mostra a resposta completa da Expo:
```json
{
  "data": [
    {
      "status": "ok", // ou "error"
      "id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }
  ]
}
```

### 3️⃣ **Verificação no Cliente**
Os compradores agora têm logs mais detalhados:
```
[PUSH] 📩 NOTIFICAÇÃO RECEBIDA EM FOREGROUND
[PUSH] 👆 USUÁRIO TOCOU NA NOTIFICAÇÃO
```

## 🧪 **NOVO TESTE MELHORADO**

### **Passo 1: Teste Básico**
1. Inicie o servidor: `cd back-end && npm start`
2. No app do vendedor, clique em "Enviar para Compradores"
3. **Verifique os novos logs no servidor:**

```bash
# Logs que você deve ver:
[TEST-BROADCAST] 📱 Compradores com tokens válidos: 4
[PUSH] ✅ Resposta completa da Expo: {"data":[{"status":"ok","id":"xxx"}]}
```

### **Passo 2: Diagnóstico de Token**
Se você ver `"status": "error"` na resposta da Expo, pode ser:
- ❌ **DeviceNotRegistered**: Token inválido/expirado
- ❌ **InvalidCredentials**: Problema de configuração do projeto
- ❌ **MessageTooBig**: Mensagem muito grande

### **Passo 3: Verificação no App do Comprador**
No console do app do comprador, procure por:
```
[PUSH] 📩 NOTIFICAÇÃO RECEBIDA EM FOREGROUND
```

**Se NÃO aparecer:** O problema está na entrega da Expo
**Se aparecer:** O problema está na configuração de pop-up local

## 🔧 **SOLUÇÕES IMPLEMENTADAS**

### **Backend:**
- ✅ Logs detalhados da resposta da Expo
- ✅ Verificação de tokens válidos vs inválidos  
- ✅ Mensagem personalizada com nome do comprador
- ✅ Configurações Android/iOS maximizadas

### **Cliente:**
- ✅ Método alternativo para obter tokens da Expo
- ✅ Logs detalhados de recebimento
- ✅ Alert de debug para notificações de teste
- ✅ Canal de alta prioridade configurado

## 🚨 **POSSÍVEIS CAUSAS DO PROBLEMA**

### **1. Tokens Inválidos (Mais Provável)**
```bash
# Verificar no servidor se aparece:
[TEST-BROADCAST] ❌ Compradores sem tokens: 4
```
**Solução:** Compradores precisam abrir o app para registrar tokens válidos

### **2. Configuração do Expo (Provável)**
Se os tokens são válidos mas a Expo retorna erro:
```json
{"data":[{"status":"error","message":"DeviceNotRegistered"}]}
```
**Solução:** Tokens expiraram, compradores precisam reabrir o app

### **3. Configuração de Permissões (Menos Provável)**
```bash
# No app do comprador, verificar se aparece:
[PUSH] Permissões concedidas
```

### **4. Modo Não Perturbe/Configurações do Sistema**
- Android: Verificar se notificações estão ativadas para o app
- iOS: Verificar se "Não Perturbe" está desativado

## 📱 **AÇÕES IMEDIATAS**

### **Para Testar Agora:**
1. **Compradores:** Fechem e abram o app novamente (para registrar tokens frescos)
2. **Vendedor:** Teste novamente o envio
3. **Verifique os novos logs detalhados no servidor**

### **Se Ainda Não Funcionar:**
1. Um comprador deve **ativar notificações** em: 
   - Android: `Configurações > Apps > GoandBuy > Notificações > Ativar`
   - iOS: `Configurações > Notificações > GoandBuy > Permitir Notificações`

2. **Teste com app minimizado** (não fechado completamente)

---

## 🎯 **RESULTADO ESPERADO APÓS CORREÇÕES**

### **Logs do Servidor:**
```
[TEST-BROADCAST] 📱 Compradores com tokens válidos: 4
[TEST-BROADCAST] ❌ Compradores sem tokens: 0
[PUSH] ✅ Resposta completa da Expo: {"data":[{"status":"ok"}]}
```

### **No Dispositivo do Comprador:**
- 🔔 **Pop-up imediato** aparece na tela
- 📱 **Som de notificação** toca
- 📳 **Vibração** (Android)
- 💡 **LED pisca** (Android)

**🎉 Sucesso total**: Comprador vê "*Olá [Nome]! Esta é uma mensagem de teste do vendedor Alexandre Café. Se você está vendo isso, as notificações estão funcionando! 📱✨*"