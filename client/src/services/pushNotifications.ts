interface CustomPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  unsubscribe: () => Promise<void>;
}

interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    type?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private subscription: CustomPushSubscription | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        // Register service worker
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        
        // Request notification permission
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          // Subscribe to push notifications
          const pushSubscription = await this.swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.getVapidKey(),
          });

          // Create custom subscription object
          this.subscription = {
            endpoint: pushSubscription.endpoint,
            keys: {
              p256dh: pushSubscription.keys?.p256dh || '',
              auth: pushSubscription.keys?.auth || '',
            },
            unsubscribe: async () => {
              await pushSubscription.unsubscribe();
            },
          };

          // Send subscription to server
          await this.sendSubscriptionToServer(this.subscription);
        }
      } catch (error) {
        console.error('Push notification initialization error:', error);
      }
    }
  }

  private getVapidKey(): string {
    // In production, this should come from environment variables
    return process.env.VITE_VAPID_PUBLIC_KEY || 'test-vapid-key';
  }

  private async sendSubscriptionToServer(subscription: PushSubscription) {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }
    } catch (error) {
      console.error('Error sending subscription:', error);
    }
  }

  async unsubscribe() {
    if (this.subscription) {
      try {
        await this.subscription.unsubscribe();
        this.subscription = null;
        
        // Notify server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: (this.subscription as any).endpoint,
          }),
        });
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    }
  }

  async isSupported(): Promise<boolean> {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }

  async getPermissionStatus(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }

  // Static method to create notification from server
  static async createNotification(notification: PushNotification) {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        if (registration) {
          // Send notification to service worker
          await fetch('/api/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(notification),
          });
        }
      } catch (error) {
        console.error('Error creating push notification:', error);
      }
    }
  }
}

export default PushNotificationService;
