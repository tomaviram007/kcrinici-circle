import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const VAPID_PUBLIC_KEY = "BNoKm0OKIbQYQ3qlSGhFRz3CrYsO9bVrOVJpGak5xSOvAFTjHQxCi_SDvGdbGLqV3MVNS5WQnKjXxZxfGVL0fE0";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw-push.js");
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch {
      // Silently handle
    }
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({ title: "ההתראות נחסמו", description: "יש לאשר התראות בהגדרות הדפדפן", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw-push.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: "יש להתחבר כדי לקבל התראות", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const subJson = subscription.toJSON();
      await supabase.from("push_subscriptions").upsert({
        user_id: session.user.id,
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys!.p256dh!,
        auth_key: subJson.keys!.auth!,
      }, { onConflict: "user_id,endpoint" });

      setIsSubscribed(true);
      toast({ title: "התראות הופעלו! 🔔", description: "תקבלו עדכונים על תוכן חדש במועדון" });
    } catch (err: any) {
      console.error("Push subscription error:", err);
      toast({ title: "שגיאה בהפעלת התראות", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, toast]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw-push.js");
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();

          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("user_id", session.user.id)
              .eq("endpoint", endpoint);
          }
        }
      }
      setIsSubscribed(false);
      toast({ title: "התראות בוטלו" });
    } catch (err: any) {
      console.error("Push unsubscribe error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe };
}
