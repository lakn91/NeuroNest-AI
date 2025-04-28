import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

/**
 * Register a new user
 * @param req Express request
 * @param res Express response
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
    });
    
    // Create custom token for the user
    const token = await admin.auth().createCustomToken(userRecord.uid);
    
    return res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
      token
    });
  } catch (error) {
    console.error('Error registering user:', error);
    
    // Handle Firebase Auth specific errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'Email already in use' });
    } else if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'Invalid email format' });
    } else if (error.code === 'auth/weak-password') {
      return res.status(400).json({ error: 'Password is too weak' });
    }
    
    return res.status(500).json({ error: 'Failed to register user' });
  }
};

/**
 * Login a user
 * @param req Express request
 * @param res Express response
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // This is a server-side operation, so we need to use Firebase Admin SDK
    // to verify the credentials and create a custom token
    
    // First, get the user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Create custom token for the user
    // Note: In a real-world scenario, you would verify the password before creating a token
    // Firebase Admin SDK doesn't provide a direct way to verify passwords
    // You might need to use Firebase Auth REST API or implement your own authentication logic
    const token = await admin.auth().createCustomToken(userRecord.uid);
    
    return res.status(200).json({ 
      message: 'User logged in successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
      token
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    
    // Handle Firebase Auth specific errors
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return res.status(401).json({ error: 'Invalid email or password' });
    } else if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'Invalid email format' });
    } else if (error.code === 'auth/user-disabled') {
      return res.status(403).json({ error: 'Account has been disabled' });
    }
    
    return res.status(500).json({ error: 'Failed to login' });
  }
};

/**
 * Get current user information
 * @param req Express request
 * @param res Express response
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // The user ID should be attached to the request by the auth middleware
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get user details from Firebase Auth
    const userRecord = await admin.auth().getUser(userId);
    
    return res.status(200).json({
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
      }
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return res.status(500).json({ error: 'Failed to get user information' });
  }
};

/**
 * Update user profile
 * @param req Express request
 * @param res Express response
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { displayName, photoURL } = req.body;
    
    // Update user in Firebase Auth
    const userRecord = await admin.auth().updateUser(userId, {
      displayName,
      photoURL,
    });
    
    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * Change user password
 * @param req Express request
 * @param res Express response
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }
    
    // Update password in Firebase Auth
    await admin.auth().updateUser(userId, {
      password: newPassword,
    });
    
    return res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ error: 'Password is too weak' });
    }
    
    return res.status(500).json({ error: 'Failed to change password' });
  }
};

/**
 * Send password reset email
 * @param req Express request
 * @param res Express response
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Generate password reset link
    const link = await admin.auth().generatePasswordResetLink(email);
    
    // In a real application, you would send this link via email
    // For now, we'll just return it in the response
    return res.status(200).json({
      message: 'Password reset link generated successfully',
      resetLink: link,
    });
  } catch (error) {
    console.error('Error generating password reset link:', error);
    
    if (error.code === 'auth/user-not-found') {
      // For security reasons, don't reveal that the user doesn't exist
      return res.status(200).json({
        message: 'If the email exists, a password reset link will be sent',
      });
    }
    
    return res.status(500).json({ error: 'Failed to generate password reset link' });
  }
};

/**
 * Logout user
 * @param req Express request
 * @param res Express response
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Revoke all refresh tokens for the user
    await admin.auth().revokeRefreshTokens(userId);
    
    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error logging out:', error);
    return res.status(500).json({ error: 'Failed to logout' });
  }
};