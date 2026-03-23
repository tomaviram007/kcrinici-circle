import { Globe, Facebook, Instagram, Linkedin } from "lucide-react";

interface SocialLinksProps {
  website_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  size?: "sm" | "md";
}

const SocialLinks = ({ website_url, facebook_url, instagram_url, linkedin_url, size = "sm" }: SocialLinksProps) => {
  const links = [
    { url: website_url, icon: Globe, label: "אתר" },
    { url: facebook_url, icon: Facebook, label: "פייסבוק" },
    { url: instagram_url, icon: Instagram, label: "אינסטגרם" },
    { url: linkedin_url, icon: Linkedin, label: "לינקדאין" },
  ].filter(l => l.url);

  if (links.length === 0) return null;

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const btnSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <div className="flex items-center gap-1.5">
      {links.map(({ url, icon: Icon, label }) => (
        <a
          key={label}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`${btnSize} inline-flex items-center justify-center rounded-full bg-secondary border border-border text-muted-foreground hover:text-gold hover:border-gold/30 hover:scale-110 transition-all duration-200`}
          title={label}
        >
          <Icon className={iconSize} />
        </a>
      ))}
    </div>
  );
};

export default SocialLinks;
