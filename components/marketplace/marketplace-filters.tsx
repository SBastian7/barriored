'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Filter, X } from 'lucide-react'

interface MarketplaceFiltersProps {
  filters: {
    category: string
    status: string
  }
  onFilterChange: (key: string, value: string) => void
  onClearFilters: () => void
  totalCount: number
  filteredCount: number
}

export function MarketplaceFilters({
  filters,
  onFilterChange,
  onClearFilters,
  totalCount,
  filteredCount,
}: MarketplaceFiltersProps) {
  const hasActiveFilters = filters.category !== 'all' || filters.status !== 'all'

  return (
    <section className="flex flex-wrap items-center gap-4 p-6 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5 text-primary" />
        <span className="font-black uppercase tracking-widest text-[10px] text-black/40">
          Filtros:
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="font-black uppercase tracking-widest text-[10px] text-black/60">
          Categoría:
        </label>
        <Select
          value={filters.category}
          onValueChange={(v) => onFilterChange('category', v)}
        >
          <SelectTrigger className="brutalist-input w-40 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-2 border-black rounded-none">
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="vendo">Vendo</SelectItem>
            <SelectItem value="compro">Compro</SelectItem>
            <SelectItem value="arriendo">Arriendo</SelectItem>
            <SelectItem value="servicios">Servicios</SelectItem>
            <SelectItem value="trabajo">Trabajo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label className="font-black uppercase tracking-widest text-[10px] text-black/60">
          Estado:
        </label>
        <Select
          value={filters.status}
          onValueChange={(v) => onFilterChange('status', v)}
        >
          <SelectTrigger className="brutalist-input w-40 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-2 border-black rounded-none">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="sold">Vendido</SelectItem>
            <SelectItem value="archived">Archivado</SelectItem>
            <SelectItem value="flagged">Marcado</SelectItem>
            <SelectItem value="removed">Eliminado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          onClick={onClearFilters}
          variant="outline"
          size="sm"
          className="brutalist-button h-10 gap-2"
        >
          <X className="h-4 w-4" /> Limpiar Filtros
        </Button>
      )}

      <div className="ml-auto text-[10px] font-black uppercase tracking-widest text-black/40">
        Mostrando {filteredCount} de {totalCount} clasificados
      </div>
    </section>
  )
}
