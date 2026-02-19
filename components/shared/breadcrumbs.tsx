'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

type BreadcrumbItem = {
    label: string
    href?: string
    active?: boolean
}

type Props = {
    items: BreadcrumbItem[]
    className?: string
}

export function Breadcrumbs({ items, className }: Props) {
    return (
        <nav className={cn("flex items-center flex-wrap gap-2 mb-8", className)} aria-label="Breadcrumb">
            <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all font-black uppercase text-[10px] tracking-tighter italic"
            >
                <Home className="h-3 w-3" />
                Inicio
            </Link>

            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-black" strokeWidth={3} />
                    {item.href && !item.active ? (
                        <Link
                            href={item.href}
                            className="px-3 py-1 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all font-black uppercase text-[10px] tracking-tighter italic"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="px-3 py-1 bg-primary text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase text-[10px] tracking-tighter italic">
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    )
}
