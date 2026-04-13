import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserPermissions = () => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Check if admin (admins have all permissions)
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = roles?.some((r: any) => r.role === "admin");
      if (isAdmin) {
        setPermissions(["all"]);
        setLoading(false);
        return;
      }

      const { data: perms } = await supabase
        .from("user_permissions")
        .select("permission")
        .eq("user_id", user.id)
        .eq("granted", true);

      setPermissions(perms?.map((p: any) => p.permission) || []);
      setLoading(false);
    };

    fetchPermissions();
  }, []);

  const hasPermission = (permission: string) => {
    return permissions.includes("all") || permissions.includes(permission);
  };

  return { permissions, loading, hasPermission };
};
