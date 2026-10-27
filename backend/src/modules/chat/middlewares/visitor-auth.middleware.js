'use strict';
const visitorService = require('../services/visitor.service');

module.exports = async function visitorAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization;
    const match = typeof authorization === 'string'
      ? /^Bearer ([A-Za-z0-9_-]+)$/.exec(authorization) : null;
    if (!match) {
      return res.status(401).json({ success: false, message: 'Token de visitante requerido.' });
    }
    req.visitorSession = await visitorService.verificarToken(match[1]);
    return next();
  } catch (error) {
    return next(error);
  }
};
