import { MessageCircle, Facebook } from "lucide-react";

interface ShareButtonsProps {
  title: string;
  url?: string;
  text?: string;
  size?: "sm" | "md";
  className?: string;
}

const SITE = typeof window !== "undefined" ? window.location.origin : "https://kcrinici.com";

const ShareButtons = ({ title, url, text, size = "sm", className = "" }: ShareButtonsProps) => {
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : SITE);
  const shareText = text || title;

  const waText = `${shareText}\n${shareUrl}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(waText)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const iconSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const btnSize = size === "md" ? "h-8 w-8" : "h-7 w-7";

  return (
    <div className={`flex items-center gap-1.5 ${className}`} dir="rtl" onClick={stop}>
      <span className="font-body text-[10px] text-muted-foreground ml-1">שתפו:</span>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="שתף בוואטסאפ"
        title="שתף בוואטסאפ"
        onClick={stop}
        className={`${btnSize} inline-flex items-center justify-center rounded-full bg-green-600/15 text-green-600 hover:bg-green-600 hover:text-white transition-colors`}
      >
        <MessageCircle className={iconSize} />
      </a>
      <a
        href={facebookHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="שתף בפייסבוק"
        title="שתף בפייסבוק"
        onClick={stop}
        className={`${btnSize} inline-flex items-center justify-center rounded-full bg-blue-600/15 text-blue-500 hover:bg-blue-600 hover:text-white transition-colors`}
      >
        <Facebook className={iconSize} />
      </a>
    </div>
  );
};

export default ShareButtons;
