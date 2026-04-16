import SidebarAdStack from "./SidebarAdStack";

interface ContentWithSidebarAdsProps {
  children: React.ReactNode;
  targetPage?: string;
  maxSlots?: number;
  className?: string;
}

/**
 * Wraps main page content with sidebar ad columns on both sides (desktop only).
 * On mobile, sidebars are hidden and content takes full width.
 */
const ContentWithSidebarAds = ({
  children,
  targetPage = "all",
  maxSlots = 3,
  className,
}: ContentWithSidebarAdsProps) => {
  return (
    <div className={`w-full ${className || ""}`}>
      <div className="flex gap-6 justify-center">
        {/* Right sidebar (appears first in RTL) */}
        <div className="hidden xl:block w-[250px] shrink-0 pt-4 sticky top-24 self-start">
          <SidebarAdStack targetPage={targetPage} maxSlots={maxSlots} side="right" />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 max-w-7xl">
          {children}
        </div>

        {/* Left sidebar */}
        <div className="hidden xl:block w-[250px] shrink-0 pt-4 sticky top-24 self-start">
          <SidebarAdStack targetPage={targetPage} maxSlots={maxSlots} side="left" />
        </div>
      </div>
    </div>
  );
};

export default ContentWithSidebarAds;
