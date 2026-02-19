import { Phone, MapPin, Clock, ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { PublicService } from '@/lib/types'

export function ServiceCard({ service }: { service: PublicService }) {
    return (
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none bg-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all group overflow-hidden">
            <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading font-black text-xl uppercase tracking-tight italic group-hover:text-primary transition-colors leading-tight">
                        {service.name}
                    </h3>
                    <div className="w-8 h-8 border-2 border-black flex items-center justify-center bg-accent/10 group-hover:bg-primary group-hover:text-white transition-colors flex-shrink-0">
                        <ArrowUpRight className="h-4 w-4" />
                    </div>
                </div>

                {service.description && (
                    <p className="text-sm text-black/60 font-medium line-clamp-2 italic">
                        "{service.description}"
                    </p>
                )}

                <div className="space-y-2 pt-2 border-t-2 border-dashed border-black/10">
                    {service.phone && (
                        <a
                            href={`tel:${service.phone}`}
                            className="flex items-center gap-3 text-sm font-black uppercase tracking-widest hover:text-primary transition-colors"
                        >
                            <div className="w-7 h-7 border border-black bg-black text-white flex items-center justify-center shrink-0">
                                <Phone className="h-3.5 w-3.5" />
                            </div>
                            {service.phone}
                        </a>
                    )}

                    {service.address && (
                        <div className="flex items-center gap-3 text-xs font-bold text-black/50">
                            <div className="w-7 h-7 border border-black bg-accent/20 flex items-center justify-center shrink-0">
                                <MapPin className="h-3.5 w-3.5 text-black" />
                            </div>
                            <span className="line-clamp-1">{service.address}</span>
                        </div>
                    )}

                    {service.hours && (
                        <div className="flex items-center gap-3 text-xs font-bold text-black/50">
                            <div className="w-7 h-7 border border-black bg-secondary/20 flex items-center justify-center shrink-0">
                                <Clock className="h-3.5 w-3.5 text-black" />
                            </div>
                            <span className="line-clamp-1">{service.hours}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
