import jwt from 'jsonwebtoken';

export const verifyAdmin = (req, res, next) => {
  const possibleTokens = [req.cookies.admin_token, req.cookies.student_token, req.cookies.token].filter(Boolean);
  
  if (possibleTokens.length === 0) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  let hasValidTokenWrongRole = false;

  for (const token of possibleTokens) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');
      if (decoded.role === 'admin') {
        req.user = decoded;
        return next();
      } else {
        hasValidTokenWrongRole = true;
      }
    } catch (err) {
      // Continue to the next token
    }
  }

  if (hasValidTokenWrongRole) {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }

  return res.status(401).json({ success: false, message: 'Unauthorized or invalid token' });
};

export const verifyStudent = (req, res, next) => {
  const possibleTokens = [req.cookies.student_token, req.cookies.admin_token, req.cookies.token].filter(Boolean);
  
  if (possibleTokens.length === 0) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  let hasValidTokenWrongRole = false;

  for (const token of possibleTokens) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');
      if (decoded.role === 'student') {
        req.user = decoded;
        return next();
      } else {
        hasValidTokenWrongRole = true;
      }
    } catch (err) {
      // Continue to the next token
    }
  }

  if (hasValidTokenWrongRole) {
    return res.status(403).json({ success: false, message: 'Forbidden: Student access required' });
  }

  return res.status(401).json({ success: false, message: 'Unauthorized or invalid token' });
};

export const verifyAuth = (req, res, next) => {
  const possibleTokens = [req.cookies.admin_token, req.cookies.student_token, req.cookies.token].filter(Boolean);
  
  if (possibleTokens.length === 0) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  for (const token of possibleTokens) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');
      req.user = decoded;
      return next();
    } catch (err) {
      // Continue to the next token
    }
  }

  return res.status(401).json({ success: false, message: 'Invalid token' });
};
