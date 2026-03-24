import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border border-border/40 p-[2px] transition-all duration-300 ease-in-out",
      "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-gold/90 data-[state=checked]:to-gold data-[state=checked]:border-gold/50 data-[state=checked]:shadow-[0_0_8px_hsl(43_72%_52%/0.3)]",
      "data-[state=unchecked]:bg-muted/60 data-[state=unchecked]:border-border/50",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-[18px] w-[18px] rounded-full shadow-md ring-0 transition-all duration-300 ease-in-out",
        "data-[state=checked]:translate-x-[20px] data-[state=checked]:bg-background data-[state=checked]:shadow-[0_1px_4px_rgba(0,0,0,0.3)]",
        "data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-foreground/70 data-[state=unchecked]:shadow-[0_1px_3px_rgba(0,0,0,0.2)]",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
