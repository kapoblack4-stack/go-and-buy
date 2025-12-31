const nodemailer = require('nodemailer');

// Configuração do transportador de email
const createTransporter = () => {
  console.log('[EMAIL-SERVICE] 🔧 Configurando transporter...');
  console.log('[EMAIL-SERVICE] NODE_ENV:', process.env.NODE_ENV);
  console.log('[EMAIL-SERVICE] EMAIL_USER:', process.env.EMAIL_USER);
  
  // Em desenvolvimento, sempre usar modo offline para evitar problemas de certificados
  if (process.env.NODE_ENV === 'development') {
    console.log('[EMAIL-SERVICE] 🧪 Modo desenvolvimento: emails exibidos no console');
    return null; // Não criar transporter real em desenvolvimento
  }
  
  // Para produção com Gmail
  try {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } catch (error) {
    console.error('[EMAIL-SERVICE] Erro ao criar transporter:', error.message);
    return null;
  }
};

// Gerar código OTP de 6 dígitos
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Enviar email de verificação
const sendVerificationEmail = async (email, code, userName = '') => {
  try {
    console.log('[EMAIL-SERVICE] 📤 Tentando enviar email...');
    console.log('[EMAIL-SERVICE] Para:', email);
    console.log('[EMAIL-SERVICE] Código:', code);
    
    // Em desenvolvimento, sempre mostrar no console
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [EMAIL-SERVICE] MODO DESENVOLVIMENTO');
      console.log('📧 Email:', email);
      console.log('👤 Usuário:', userName);
      console.log('🔐 Código de verificação:', code);
      console.log('⏰ Válido por 10 minutos');
      console.log('─'.repeat(50));
      
      // Simular sucesso
      return { success: true, messageId: 'dev-mode-' + Date.now() };
    }

    const transporter = createTransporter();
    
    // Se não conseguiu criar o transporter, falhar graciosamente
    if (!transporter) {
      console.log('[EMAIL-SERVICE] ⚠️  Transporter não disponível, usando modo console:');
      console.log('🔐 Código de verificação para', email + ':', code);
      return { success: true, messageId: 'console-mode-' + Date.now() };
    }
    
    const mailOptions = {
      from: {
        name: 'GoandBuy',
        address: process.env.EMAIL_USER || 'noreply@goandbuy.com'
      },
      to: email,
      subject: 'Confirme seu email - GoandBuy',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirme seu email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #704F38; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .code-container { background-color: white; border: 2px dashed #704F38; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
            .code { font-size: 32px; font-weight: bold; color: #704F38; letter-spacing: 5px; font-family: monospace; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛒 GoandBuy</h1>
              <p>Confirme seu endereço de email</p>
            </div>
            
            <div class="content">
              <h2>Olá${userName ? `, ${userName}` : ''}! 👋</h2>
              
              <p>Obrigado por se registrar no GoandBuy! Para completar seu cadastro, confirme seu email usando o código abaixo:</p>
              
              <div class="code-container">
                <p style="margin: 0; font-size: 14px; color: #666;">Seu código de verificação:</p>
                <div class="code">${code}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Este código expira em <strong>10 minutos</strong></li>
                  <li>Você tem <strong>3 tentativas</strong> para usar o código</li>
                  <li>Não compartilhe este código com ninguém</li>
                </ul>
              </div>
              
              <p>Se você não solicitou este cadastro, pode ignorar este email com segurança.</p>
              
              <p>Bem-vindo à nossa comunidade de compradores e vendedores!</p>
              
              <div class="footer">
                <p>© 2025 GoandBuy - Todos os direitos reservados</p>
                <p>Este é um email automático, não responda a esta mensagem.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      // Versão texto simples como fallback
      text: `
        GoandBuy - Confirmação de Email
        
        Olá${userName ? `, ${userName}` : ''}!
        
        Seu código de verificação é: ${code}
        
        Este código expira em 10 minutos e você tem 3 tentativas para usá-lo.
        
        Se você não solicitou este cadastro, ignore este email.
        
        Obrigado!
        Equipe GoandBuy
      `
    };

    if (transporter) {
      const result = await transporter.sendMail(mailOptions);
      console.log('[EMAIL-SERVICE] Email enviado:', result.messageId);
      return { success: true, messageId: result.messageId };
    } else {
      console.log('[EMAIL-SERVICE] ⚠️ Modo desenvolvimento: email simulado');
      return { success: true, messageId: 'simulated-' + Date.now() };
    }
    
  } catch (error) {
    console.error('[EMAIL-SERVICE] Erro ao enviar email:', error);
    return { success: false, error: error.message };
  }
};

// Enviar email de confirmação de conta ativada
const sendAccountActivatedEmail = async (email, userName) => {
  try {
    // Em desenvolvimento, apenas logar
    if (process.env.NODE_ENV === 'development') {
      console.log('[EMAIL-SERVICE] 🎉 Conta ativada para:', email, '(', userName, ')');
      return { success: true, messageId: 'dev-activated-' + Date.now() };
    }
    
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('[EMAIL-SERVICE] ⚠️ Conta ativada (modo simulado):', email);
      return { success: true, messageId: 'simulated-activated-' + Date.now() };
    }
    
    const mailOptions = {
      from: {
        name: 'GoandBuy',
        address: process.env.EMAIL_USER || 'noreply@goandbuy.com'
      },
      to: email,
      subject: 'Conta ativada com sucesso! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #22C55E; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Bem-vindo ao GoandBuy!</h1>
            </div>
            <div class="content">
              <h2>Parabéns, ${userName}!</h2>
              <p>Sua conta foi ativada com sucesso! Agora você pode aproveitar todos os recursos do GoandBuy.</p>
              <p>Comece explorando nossos carrinhos e vendedores disponíveis.</p>
              <p>Obrigado por escolher o GoandBuy! 🛒</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    if (transporter) {
      await transporter.sendMail(mailOptions);
      console.log('[EMAIL-SERVICE] Email de ativação enviado para:', email);
    } else {
      console.log('[EMAIL-SERVICE] Email de ativação simulado para:', email);
    }
    
  } catch (error) {
    console.error('[EMAIL-SERVICE] Erro ao enviar email de ativação:', error);
  }
};

// Enviar email de recuperação de senha
const sendPasswordResetEmail = async (email, code, userName = '') => {
  try {
    console.log('[EMAIL-SERVICE] 🔑 Enviando email de recuperação de senha...');
    console.log('[EMAIL-SERVICE] Para:', email);
    console.log('[EMAIL-SERVICE] Código:', code);
    
    // Em desenvolvimento, sempre mostrar no console
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [EMAIL-SERVICE] RECUPERAÇÃO DE SENHA - MODO DESENVOLVIMENTO');
      console.log('📧 Email:', email);
      console.log('👤 Usuário:', userName);
      console.log('🔑 Código de recuperação:', code);
      console.log('⏰ Válido por 10 minutos');
      console.log('─'.repeat(50));
      
      // Simular sucesso
      return { success: true, messageId: 'dev-reset-' + Date.now() };
    }

    const transporter = createTransporter();
    
    // Se não conseguiu criar o transporter, falhar graciosamente
    if (!transporter) {
      console.log('[EMAIL-SERVICE] ⚠️  Transporter não disponível, usando modo console:');
      console.log('🔑 Código de recuperação para', email + ':', code);
      return { success: true, messageId: 'console-reset-' + Date.now() };
    }
    
    const mailOptions = {
      from: {
        name: 'GoandBuy',
        address: process.env.EMAIL_USER || 'noreply@goandbuy.com'
      },
      to: email,
      subject: 'Recuperação de Senha - GoandBuy',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperação de Senha</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF6B6B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .code-container { background-color: white; border: 2px dashed #FF6B6B; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
            .code { font-size: 32px; font-weight: bold; color: #FF6B6B; letter-spacing: 5px; font-family: monospace; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .security { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 GoandBuy</h1>
              <p>Recuperação de Senha</p>
            </div>
            
            <div class="content">
              <h2>Olá${userName ? `, ${userName}` : ''}! 👋</h2>
              
              <p>Recebemos uma solicitação para redefinir a senha da sua conta GoandBuy. Use o código abaixo para criar uma nova senha:</p>
              
              <div class="code-container">
                <p style="margin: 0; font-size: 14px; color: #666;">Seu código de recuperação:</p>
                <div class="code">${code}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Este código expira em <strong>10 minutos</strong></li>
                  <li>Não compartilhe este código com ninguém</li>
                  <li>Use este código apenas no aplicativo GoandBuy</li>
                </ul>
              </div>
              
              <div class="security">
                <strong>🛡️ Segurança:</strong>
                <p>Se você <strong>NÃO</strong> solicitou esta recuperação de senha, ignore este email e considere alterar sua senha por segurança.</p>
              </div>
              
              <p>Sua segurança é nossa prioridade!</p>
              
              <div class="footer">
                <p>© 2025 GoandBuy - Todos os direitos reservados</p>
                <p>Este é um email automático, não responda a esta mensagem.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      // Versão texto simples como fallback
      text: `
        GoandBuy - Recuperação de Senha
        
        Olá${userName ? `, ${userName}` : ''}!
        
        Seu código de recuperação de senha é: ${code}
        
        Este código expira em 10 minutos.
        
        Se você não solicitou esta recuperação, ignore este email.
        
        Equipe GoandBuy
      `
    };

    if (transporter) {
      const result = await transporter.sendMail(mailOptions);
      console.log('[EMAIL-SERVICE] Email de recuperação enviado:', result.messageId);
      return { success: true, messageId: result.messageId };
    } else {
      console.log('[EMAIL-SERVICE] ⚠️ Modo desenvolvimento: email de recuperação simulado');
      return { success: true, messageId: 'simulated-reset-' + Date.now() };
    }
    
  } catch (error) {
    console.error('[EMAIL-SERVICE] Erro ao enviar email de recuperação:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  generateOTP,
  sendVerificationEmail,
  sendAccountActivatedEmail,
  sendPasswordResetEmail
};