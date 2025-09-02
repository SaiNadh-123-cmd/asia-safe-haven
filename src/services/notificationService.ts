import { supabase } from '@/integrations/supabase/client';

export class NotificationService {
  private fcmToken: string | null = null;

  /**
   * Initialize Firebase Cloud Messaging
   * Note: This requires Firebase SDK setup in your app
   */
  async initializeFCM() {
    try {
      // Check if service worker and notifications are supported
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        console.warn('Browser does not support notifications');
        return false;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
        return true;
      } else {
        console.warn('Notification permission denied');
        return false;
      }
      
    } catch (error) {
      console.error('Error initializing FCM:', error);
      return false;
    }
  }

  /**
   * Hash FCM token using SHA-256
   */
  private async hashFCMToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Register FCM token with backend
   * Call this after user authentication
   */
  async registerFCMToken(token: string) {
    try {
      // Validate token format for basic security
      if (!token || token.length < 10 || !/^[a-zA-Z0-9_-]+$/.test(token.replace(/[:.]/g, ''))) {
        throw new Error('Invalid token format');
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // For unauthenticated users, store token temporarily in localStorage
        localStorage.setItem('pending_fcm_token', token);
        this.fcmToken = token;
        return true;
      }

      const response = await supabase.functions.invoke('notifications', {
        body: { 
          fcm_token: token 
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.error) {
        throw response.error;
      }

      // Hash the FCM token before storage
      const tokenHash = await this.hashFCMToken(token);

      // Also update user profile directly for immediate use with hashed token
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: session.user.id,
          fcm_token: token,
          fcm_token_hash: tokenHash,
          last_updated: new Date().toISOString()
        });

      if (updateError) {
        console.error('Error updating user profile with FCM token:', updateError);
      }

      this.fcmToken = token;
      // Clear any pending token
      localStorage.removeItem('pending_fcm_token');
      console.log('FCM token registered successfully');
      return true;
      
    } catch (error) {
      console.error('Error registering FCM token:', error);
      return false;
    }
  }

  /**
   * Generate a secure mock token for development/testing
   * Enhanced with better entropy and validation
   */
  generateSecureMockToken(): string {
    const timestamp = Date.now();
    const randomBytes = new Uint8Array(32); // Increased entropy
    crypto.getRandomValues(randomBytes);
    const randomStr = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    const token = `fcm_dev_${timestamp}_${randomStr}`;
    
    // Validate our own generated token
    if (token.length < 40) {
      throw new Error('Generated token too short for security requirements');
    }
    
    return token;
  }

  /**
   * Manually trigger disaster check
   * Useful for testing or immediate checks
   */
  async triggerDisasterCheck() {
    try {
      const response = await supabase.functions.invoke('notifications', {
        body: {},
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.error) {
        throw response.error;
      }

      console.log('Disaster check triggered successfully');
      return response.data;
      
    } catch (error) {
      console.error('Error triggering disaster check:', error);
      throw error;
    }
  }

  /**
   * Show local notification (fallback if FCM fails)
   */
  showLocalNotification(title: string, body: string, options: NotificationOptions = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/badge-icon.png',
        ...options
      });
    } else {
      console.warn('Cannot show notification - permission not granted');
    }
  }

  /**
   * Get current FCM token
   */
  getFCMToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Check if notifications are enabled
   */
  areNotificationsEnabled(): boolean {
    return Notification.permission === 'granted';
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

/**
 * Example Firebase setup code (add to your firebase.js file):
 * 
 * import { initializeApp } from 'firebase/app';
 * import { getMessaging, getToken, onMessage } from 'firebase/messaging';
 * 
 * const firebaseConfig = {
 *   apiKey: "your-api-key",
 *   authDomain: "your-project.firebaseapp.com",
 *   projectId: "your-project-id",
 *   storageBucket: "your-project.appspot.com",
 *   messagingSenderId: "your-sender-id",
 *   appId: "your-app-id"
 * };
 * 
 * const app = initializeApp(firebaseConfig);
 * const messaging = getMessaging(app);
 * 
 * // Get FCM token
 * export const getFCMToken = async () => {
 *   try {
 *     const token = await getToken(messaging, {
 *       vapidKey: 'your-vapid-key'
 *     });
 *     return token;
 *   } catch (error) {
 *     console.error('Error getting FCM token:', error);
 *     return null;
 *   }
 * };
 * 
 * // Listen for foreground messages
 * onMessage(messaging, (payload) => {
 *   console.log('Message received:', payload);
 *   // Handle foreground notification
 *   if (payload.notification) {
 *     new Notification(payload.notification.title || 'Disaster Alert', {
 *       body: payload.notification.body,
 *       icon: payload.notification.icon
 *     });
 *   }
 * });
 */