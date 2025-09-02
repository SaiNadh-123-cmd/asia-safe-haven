import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notificationService } from '@/services/notificationService';

interface UseNotificationsReturn {
  notificationsEnabled: boolean;
  requestPermission: () => Promise<boolean>;
  registerToken: (token: string, locationData?: { latitude: number, longitude: number, city?: string, state?: string, country?: string }) => Promise<boolean>;
  triggerCheck: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    // Check initial notification permission status
    const checkPermissions = async () => {
      const enabled = await notificationService.initializeFCM();
      setNotificationsEnabled(enabled);
    };

    checkPermissions();
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    try {
      const granted = await notificationService.initializeFCM();
      setNotificationsEnabled(granted);
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  };

  const registerToken = async (token: string, locationData?: { latitude: number, longitude: number, city?: string, state?: string, country?: string }): Promise<boolean> => {
    try {
      const success = await notificationService.registerFCMToken(token, locationData);
      return success;
    } catch (error) {
      console.error('Failed to register FCM token:', error);
      return false;
    }
  };

  const triggerCheck = async (): Promise<void> => {
    try {
      await notificationService.triggerDisasterCheck();
    } catch (error) {
      console.error('Failed to trigger disaster check:', error);
    }
  };

  return {
    notificationsEnabled,
    requestPermission,
    registerToken,
    triggerCheck
  };
};