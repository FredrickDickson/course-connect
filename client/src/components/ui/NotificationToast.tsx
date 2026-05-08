import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useNotifications, Notification } from "@/contexts/NotificationContext";

interface ToastNotificationProps {
  notification: Notification;
  onClose: () => void;
}

export function NotificationToast({ notification, onClose }: ToastNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'academic':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'social':
        return <Info className="h-5 w-5 text-blue-600" />;
      case 'administrative':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'system':
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getPriorityStyles = () => {
    switch (notification.priority) {
      case 'urgent':
        return 'border-red-200 bg-red-50';
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'normal':
        return 'border-blue-200 bg-blue-50';
      case 'low':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  return (
    <div className={`
      fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg border shadow-lg
      transform transition-all duration-300 ease-in-out
      ${getPriorityStyles()}
    `}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-medium text-sm text-gray-900 mb-1">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                {notification.message}
              </p>
              {notification.action_text && (
                <button
                  onClick={() => {
                    if (notification.action_url) {
                      window.location.href = notification.action_url;
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {notification.action_text}
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationToastContainer() {
  const { notifications, markAsRead } = useNotifications();
  
  // Show toasts for new, unread notifications only
  const newNotifications = notifications.filter(n => !n.read).slice(0, 3);

  if (newNotifications.length === 0) return null;

  return (
    <>
      {newNotifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{ top: `${index * 120}px` }}
          className="fixed right-4 z-50"
        >
          <NotificationToast
            notification={notification}
            onClose={() => markAsRead(notification.id)}
          />
        </div>
      ))}
    </>
  );
}
