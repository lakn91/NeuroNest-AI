import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

// Extend the Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        role?: string;
      };
    }
  }
}

/**
 * Middleware to verify Firebase authentication token
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    try {
      // Verify the token
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Attach user info to the request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || 'user',
      };
      
      next();
    } catch (error) {
      console.error('Error verifying token:', error);
      
      if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({ error: 'Unauthorized: Token expired' });
      } else if (error.code === 'auth/id-token-revoked') {
        return res.status(401).json({ error: 'Unauthorized: Token revoked' });
      } else {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
    }
  } catch (error) {
    console.error('Error in auth middleware:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if user has admin role
 */
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  
  next();
};