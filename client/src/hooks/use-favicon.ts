import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { updateFavicon } from "@/lib/favicon";

interface SystemSettings {
  logo?: string;
  [key: string]: any;
}

export function useFavicon() {
  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ['/api/settings/public'],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (settings?.logo) {
      updateFavicon(settings.logo);
    }
  }, [settings?.logo]);

  useEffect(() => {
    const handleLogoUpdate = (event: CustomEvent<{ logoUrl: string }>) => {
      if (event.detail?.logoUrl) {
        updateFavicon(event.detail.logoUrl);
      }
    };

    window.addEventListener('logo-updated', handleLogoUpdate as EventListener);

    return () => {
      window.removeEventListener('logo-updated', handleLogoUpdate as EventListener);
    };
  }, []);

  return settings?.logo;
}
