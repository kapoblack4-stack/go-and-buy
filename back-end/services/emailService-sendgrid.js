const sgMail = require('@sendgrid/mail');

// Configurar SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Gerar código OTP de 6 dígitos
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Enviar email de verificação usando SendGrid
const sendVerificationEmail = async (email, code, userName = '') => {
  try {
    console.log('[SENDGRID] 📤 Enviando email de verificação...');
    console.log('[SENDGRID] Para:', email);
    console.log('[SENDGRID] Código:', code);

    // Em desenvolvimento, mostrar no console
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [SENDGRID] MODO DESENVOLVIMENTO');
      console.log('📧 Email:', email);
      console.log('👤 Usuário:', userName);
      console.log('🔐 Código de verificação:', code);
      console.log('⏰ Válido por 10 minutos');
      return { success: true, messageId: 'dev-mode-' + Date.now() };
    }

    // Verificar se SendGrid está configurado
    if (!process.env.SENDGRID_API_KEY) {
      console.log('[SENDGRID] ⚠️ SENDGRID_API_KEY não configurada');
      console.log('🔐 Código de verificação para', email + ':', code);
      return { success: true, messageId: 'console-mode-' + Date.now() };
    }

    const msg = {
      to: email,
      from: process.env.EMAIL_USER || 'noreply@goandbuy.com',
      subject: 'Confirme seu email - GoandBuy',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Confirme seu email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #704F38; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">🛒 GoandBuy</h1>
              <p style="margin: 10px 0 0 0;">Confirme seu endereço de email</p>
            </div>
            
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
              <p>Olá${userName ? ' ' + userName : ''}! 👋</p>
              
              <p>Obrigado por se registrar no GoandBuy! Para completar seu cadastro, por favor use o código abaixo:</p>
              
              <div style="background-color: white; border: 2px dashed #704F38; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px;">
                <div style="font-size: 32px; font-weight: bold; color: #704F38; letter-spacing: 5px; font-family: monospace;">
                  ${code}
                </div>
              </div>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><strong>⚠️ Atenção:</strong></p>
                <ul style="margin: 10px 0;">
                  <li>Este código expira em <strong>10 minutos</strong></li>
                  <li>Nunca compartilhe este código com ninguém</li>
                  <li>Se você não solicitou este código, ignore este email</li>
                </ul>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Atenciosamente,<br>
                <strong>Equipe GoandBuy</strong>
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
              <p>Este é um email automático, por favor não responda.</p>
              <p>© ${new Date().getFullYear()} GoandBuy. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const result = await sgMail.send(msg);
    console.log('[SENDGRID] ✅ Email enviado com sucesso!');
    return { success: true, messageId: result[0].headers['x-message-id'] };

  } catch (error) {
    console.error('[SENDGRID] ❌ Erro ao enviar email:', error.message);
    if (error.response) {
      console.error('[SENDGRID] Resposta:', error.response.body);
    }
    throw error;
  }
};

// Enviar email de recuperação de senha
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    console.log('[SENDGRID] 📤 Enviando email de recuperação de senha...');

    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Token de reset para', email + ':', resetToken);
      return { success: true, messageId: 'dev-mode-' + Date.now() };
    }

    if (!process.env.SENDGRID_API_KEY) {
      console.log('🔐 Token de reset para', email + ':', resetToken);
      return { success: true, messageId: 'console-mode-' + Date.now() };
    }

    const msg = {
      to: email,
      from: process.env.EMAIL_USER || 'noreply@goandbuy.com',
      subject: 'Recuperação de Senha - GoandBuy',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Recuperação de Senha</h2>
          <p>Você solicitou a recuperação de senha. Use o token abaixo:</p>
          <div style="background: #f0f0f0; padding: 15px; margin: 20px 0; text-align: center; font-size: 24px; letter-spacing: 3px; font-weight: bold;">
            ${resetToken}
          </div>
          <p><strong>Este token expira em 1 hora.</strong></p>
          <p>Se você não solicitou esta recuperação, ignore este email.</p>
        </div>
      `,
    };

    const result = await sgMail.send(msg);
    console.log('[SENDGRID] ✅ Email de recuperação enviado!');
    return { success: true, messageId: result[0].headers['x-message-id'] };

  } catch (error) {
    console.error('[SENDGRID] ❌ Erro ao enviar email:', error.message);
    throw error;
  }
};

module.exports = {
  generateOTP,
  sendVerificationEmail,
  sendPasswordResetEmail
};
