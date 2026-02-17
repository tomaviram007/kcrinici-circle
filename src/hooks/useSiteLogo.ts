import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_LOGO = "/images/default-logo.png";

export interface SiteLogoSettings {
  logoUrl: string;
  logoSize: number;
  logoText: string;
  logoPosition: "center" | "right" | "left";
}

const DEFAULTS: SiteLogoSettings = {
  logoUrl: DEFAULT_LOGO,
  logoSize: 56,
  logoText: "",
  logoPosition: "center",
};

export const useSiteLogo = (): SiteLogoSettings => {
  const [settings, setSettings] = useState<SiteLogoSettings>(DEFAULTS);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["logo_url", "logo_size", "logo_text", "logo_position"]);

      if (!data) return;

      const map: Record<string, string> = {};
      data.forEach((row) => (map[row.key] = row.value));

      setSettings({
        logoUrl: map.logo_url || DEFAULTS.logoUrl,
        logoSize: parseInt(map.logo_size) || DEFAULTS.logoSize,
        logoText: map.logo_text ?? DEFAULTS.logoText,
        logoPosition: (map.logo_position as SiteLogoSettings["logoPosition"]) || DEFAULTS.logoPosition,
      });
    };
    fetchSettings();
  }, []);

  return settings;
};
