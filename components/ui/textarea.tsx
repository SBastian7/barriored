import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[120px] w-full border-2 border-black bg-white px-4 py-3 text-base shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:text-muted-foreground focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[-1px] focus:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-sans",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
