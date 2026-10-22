import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageMeta } from '@/types';

export const Pagination = ({ meta, onPageChange }: { meta: PageMeta; onPageChange: (p: number) => void }) => (
  <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3 text-sm">
    <span className="text-muted-foreground">{meta.totalRecords} store{meta.totalRecords === 1 ? '' : 's'} · Page {meta.currentPage} of {meta.totalPages}</span>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={meta.currentPage <= 1} onClick={() => onPageChange(meta.currentPage - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button>
      <Button variant="outline" size="sm" disabled={meta.currentPage >= meta.totalPages} onClick={() => onPageChange(meta.currentPage + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
    </div>
  </nav>
);
