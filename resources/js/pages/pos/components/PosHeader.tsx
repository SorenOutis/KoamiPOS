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
        <header className="bg-card flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 shadow-xs select-none">
            {/* Left: Workspace & Cashier identity */}
            <div className="flex items-center gap-3">
                <LetterFallbackImage
                    src={workspace?.logo_url ?? null}
                    alt={workspace?.name ?? 'KoamiPOS'}
                    size={38}
                    className="shrink-0 rounded-xl border shadow-xs"
                    fallbackClassName="font-bold text-sm bg-primary text-primary-foreground"
                />
                <div className="leading-tight">
                    <div className="flex items-center gap-2">
                        <span className="text-foreground text-base font-bold tracking-tight">
                            {workspace?.name ?? 'KoamiPOS'}
                        </span>
                        <Badge
                            variant="outline"
                            className="px-1.5 py-0 font-mono text-[10px] uppercase"
                        >
                            {workspace?.business_type ?? 'POS'}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                        Cashier:{' '}
                        <span className="text-foreground font-medium">
                            {cashier.name}
                        </span>
                    </p>
                </div>
            </div>

            {/* Center: Order Type Toggle & Table Picker */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="bg-muted/60 flex items-center rounded-xl border p-1">
                    <button
                        type="button"
                        onClick={() => onOrderTypeChange('dine_in')}
                        className={cn(
                            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
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
                            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
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
                            'h-8 gap-1.5 rounded-xl text-xs font-semibold',
                            !selectedTable &&
                                'border-primary/50 text-primary border-dashed',
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
                    className="relative h-8 gap-1.5 rounded-xl text-xs font-medium"
                >
                    <PauseCircle className="text-muted-foreground size-3.5" />
                    <span>Held</span>
                    {heldCount > 0 && (
                        <Badge className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-amber-500 p-0 text-[9px] font-bold text-white">
                            {heldCount}
                        </Badge>
                    )}
                </Button>

                {hasTables && (
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground hidden h-8 gap-1 rounded-xl text-xs md:inline-flex"
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
                        className="text-muted-foreground hover:text-foreground hidden h-8 gap-1 rounded-xl text-xs md:inline-flex"
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
                    className="text-muted-foreground hover:text-foreground h-8 gap-1 rounded-xl text-xs"
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
