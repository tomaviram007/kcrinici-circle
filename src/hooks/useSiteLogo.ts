import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_LOGO = "/images/default-logo.png";

export const useSiteLogo = () => {
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "logo_url")
        .maybeSingle();
      if (data?.value) setLogoUrl(data.value);
    };
    fetch();
  }, []);

  return logoUrl;
};
