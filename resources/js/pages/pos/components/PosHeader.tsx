import { Link } from '@inertiajs/react';
import LetterFallbackImage from '@/components/LetterFallbackImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/types/auth';
import {
    ChefHat,
    History,
    LayoutGrid,
    PauseCircle,
    ShoppingBag,
    UtensilsCrossed,
} from 'lucide-react';

type Cashier = {
    id: number;
    name: string;
    email: string;
};

type Props = {
    workspace: Workspace | null;
    cashier: Cashier;
    orderType: 'dine_in' | 'takeaway' | 'delivery';
    onOrderTypeChange: (type: 'dine_in' | 'takeaway' | 'delivery') => void;
    selectedTable: { id: number; name: string } | null;
    guestCount: number;
    onOpenTablePicker: () => void;
    hasTables: boolean;
    hasKds: boolean;
    heldCount: number;
    onOpenHeldOrders: () => void;
};

export default function PosHeader({
    workspace,
    cashier,
    orderType,
    onOrderTypeChange,
    selectedTable,
    guestCount,
    onOpenTablePicker,
    hasTables,
    hasKds,
    heldCount,
    onOpenHeldOrders,
}: Props) {
    return (
        <header className="flex flex-wrap items-center justify-between gap-3 bg-card border-b px-4 py-2.5 shrink-0 select-none shadow-xs">
            {/* Left: Workspace & Cashier identity */}
            <div className="flex items-center gap-3">
                <LetterFallbackImage
                    src={workspace?.logo_url ?? null}
                    alt={workspace?.name ?? 'KoamiPOS'}
                    size={38}
                    className="rounded-xl shrink-0 border shadow-xs"
                    fallbackClassName="font-bold text-sm bg-primary text-primary-foreground"
                />
                <div className="leading-tight">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-base tracking-tight text-foreground">
                            {workspace?.name ?? 'KoamiPOS'}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                            {workspace?.business_type ?? 'POS'}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Cashier: <span className="font-medium text-foreground">{cashier.name}</span>
                    </p>
                </div>
            </div>

            {/* Center: Order Type Toggle & Table Picker */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center rounded-xl bg-muted/60 p-1 border">
                    <button
                        type="button"
                        onClick={() => onOrderTypeChange('dine_in')}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                            orderType === 'dine_in'
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <UtensilsCrossed className="size-3.5" />
                        Dine-In
                    </button>
                    <button
                        type="button"
                        onClick={() => onOrderTypeChange('takeaway')}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                            orderType === 'takeaway'
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <ShoppingBag className="size-3.5" />
                        Takeaway
                    </button>
                </div>

                {hasTables && orderType === 'dine_in' && (
                    <Button
                        type="button"
                        variant={selectedTable ? 'default' : 'outline'}
                        size="sm"
                        onClick={onOpenTablePicker}
                        className={cn(
                            'h-8 text-xs font-semibold rounded-xl gap-1.5',
                            !selectedTable && 'border-dashed border-primary/50 text-primary',
                        )}
                    >
                        <UtensilsCrossed className="size-3.5" />
                        {selectedTable
                            ? `Table ${selectedTable.name} (${guestCount}p)`
                            : 'Assign Table'}
                    </Button>
                )}
            </div>

            {/* Right: Operational Actions (Held Orders, Tables, KDS, Sales History) */}
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenHeldOrders}
                    className="h-8 text-xs font-medium rounded-xl gap-1.5 relative"
                >
                    <PauseCircle className="size-3.5 text-muted-foreground" />
                    <span>Held</span>
                    {heldCount > 0 && (
                        <Badge className="size-4 p-0 flex items-center justify-center rounded-full text-[9px] font-bold bg-amber-500 text-white ml-0.5">
                            {heldCount}
                        </Badge>
                    )}
                </Button>

                {hasTables && (
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs rounded-xl gap-1 text-muted-foreground hover:text-foreground hidden md:inline-flex"
                    >
                        <Link href="/pos/tables">
                            <LayoutGrid className="size-3.5" />
                            Floor Map
                        </Link>
                    </Button>
                )}

                {hasKds && (
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs rounded-xl gap-1 text-muted-foreground hover:text-foreground hidden md:inline-flex"
                    >
                        <Link href="/pos/kds">
                            <ChefHat className="size-3.5" />
                            Kitchen KDS
                        </Link>
                    </Button>
                )}

                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs rounded-xl gap-1 text-muted-foreground hover:text-foreground"
                >
                    <Link href="/pos/sales">
                        <History className="size-3.5" />
                        Sales
                    </Link>
                </Button>
            </div>
        </header>
    );
}
