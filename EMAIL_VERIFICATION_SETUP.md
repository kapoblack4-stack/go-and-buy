# Instalação do Sistema de Verificação de Email

## 1. Instalar Nodemailer no Backend

```bash
cd back-end
npm install nodemailer
```

## 2. Configurar Variáveis de Ambiente

Crie ou atualize o arquivo `.env` na pasta `back-end`:

```env
# Email Configuration
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app

# Ou use SendGrid (recomendado para produção)
SENDGRID_API_KEY=sua-chave-sendgrid
```

## 3. Configuração do Gmail (Desenvolvimento)

Para usar Gmail em desenvolvimento:

1. Acesse sua conta Google
2. Vá para "Segurança" → "Verificação em duas etapas"
3. Gere uma "Senha de app" específica
4. Use essa senha no EMAIL_PASS

## 4. Configuração SendGrid (Produção)

Para produção, recomenda-se usar SendGrid:

1. Crie conta em https://sendgrid.com
2. Obtenha sua API Key
3. Configure no emailService.js (já preparado)

## 5. Restart do Servidor

```bash
# No backend
npm run dev
# ou
node index.js

# No frontend
npm start
```

## 6. Teste do Sistema

1. Registre um novo usuário
2. Receba o código por email
3. Digite o código na tela de verificação
4. Conta será ativada automaticamente

## Funcionalidades Implementadas

✅ Registro com envio de código OTP
✅ Tela de verificação com 6 dígitos
✅ Reenvio de código (com timer)
✅ Validação de tentativas (máx 3)
✅ Email de confirmação de ativação
✅ Timer de expiração (10 minutos)
✅ Interface amigável e responsiva
✅ Feedback visual em tempo real
✅ Tratamento de erros robusto