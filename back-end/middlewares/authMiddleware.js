const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json({ error: 'Token não fornecido' });

  // Extrair token (suporta tanto "token" quanto "Bearer token")
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error('[AUTH] Erro ao verificar token:', err.message);
    res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = authMiddleware;
