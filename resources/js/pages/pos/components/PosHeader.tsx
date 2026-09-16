import { Link } from '@inertiajs/react';
import LetterFallbackImage from '@/components/LetterFallbackImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { index as kdsIndex } from '@/routes/pos/kds';
import { index as salesIndex } from '@/routes/pos/sales';
import { index as tablesIndex } from '@/routes/pos/tables';
import type { Workspace } from '@/types/auth';
import {
    ChefHat,
    History,
    LayoutGrid,
    Menu,
    Moon,
    PauseCircle,
    Sun,
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
    const { updateAppearance } = useAppearance();
    const navigation = [
        { label: 'Orders', href: salesIndex(), icon: History },
        ...(hasKds
            ? [{ label: 'Kitchen', href: kdsIndex(), icon: ChefHat }]
            : []),
        ...(hasTables
            ? [{ label: 'Floor plan', href: tablesIndex(), icon: LayoutGrid }]
            : []),
    ];

    return (
        <header className="bg-card text-card-foreground shrink-0 border-b">
            <div className="flex h-14 min-w-0 items-center gap-2 px-3 sm:gap-4 sm:px-4 lg:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-2.5 lg:flex-none">
                    <LetterFallbackImage
                        src={workspace?.logo_url ?? null}
                        alt={workspace?.name ?? 'KoamiPOS'}
                        size={32}
                        className="shrink-0 rounded-lg border"
                        fallbackClassName="bg-primary text-primary-foreground text-sm font-bold"
                    />
                    <div className="min-w-0 lg:max-w-48">
                        <p
                            className="truncate text-sm font-bold tracking-tight"
                            title={workspace?.name ?? 'KoamiPOS'}
                        >
                            {workspace?.name ?? 'KoamiPOS'}
                        </p>
                        <p
                            className="text-muted-foreground truncate text-[11px] lg:hidden"
                            title={`Cashier: ${cashier.name}`}
                        >
                            Cashier: {cashier.name}
                        </p>
                        <p className="text-muted-foreground hidden text-[10px] font-medium tracking-wider uppercase lg:block">
                            {workspace?.business_type ?? 'POS'}
                        </p>
                    </div>
                </div>

                <nav
                    aria-label="Operations"
                    className="hidden items-center gap-1 lg:flex"
                >
                    {navigation.map(({ label, href, icon: Icon }) => (
                        <Button
                            key={label}
                            asChild
                            variant="ghost"
                            className="text-muted-foreground h-11 rounded-full px-4 text-xs"
                        >
                            <Link href={href}>
                                <Icon className="size-4" aria-hidden="true" />
                                {label}
                            </Link>
                        </Button>
                    ))}
                </nav>

                <div className="flex shrink-0 items-center gap-1 lg:ml-auto lg:gap-3">
                    <div
                        className="hidden max-w-40 min-w-0 text-right lg:block"
                        title={`Cashier: ${cashier.name}`}
                    >
                        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                            Cashier
                        </p>
                        <p className="truncate text-xs font-semibold">
                            {cashier.name}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground size-11 rounded-full"
                        aria-label="Toggle color theme"
                        title="Toggle color theme"
                        onClick={() =>
                            updateAppearance(
                                document.documentElement.classList.contains(
                                    'dark',
                                )
                                    ? 'light'
                                    : 'dark',
                            )
                        }
                    >
                        <Sun className="hidden dark:block" aria-hidden="true" />
                        <Moon className="dark:hidden" aria-hidden="true" />
                    </Button>
                    <div className="lg:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-11 rounded-full"
                                    aria-label="Open operations menu"
                                >
                                    <Menu aria-hidden="true" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-48 rounded-xl"
                            >
                                {navigation.map(
                                    ({ label, href, icon: Icon }) => (
                                        <DropdownMenuItem
                                            key={label}
                                            asChild
                                            className="min-h-11 rounded-lg"
                                        >
                                            <Link href={href}>
                                                <Icon
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                                {label}
                                            </Link>
                                        </DropdownMenuItem>
                                    ),
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <div className="border-border/60 flex min-w-0 flex-wrap items-center gap-2 border-t px-3 py-2 sm:px-4 lg:px-6">
                <div
                    role="group"
                    aria-label="Order type"
                    className="bg-muted/60 flex shrink-0 items-center rounded-full p-0.5"
                >
                    {(
                        [
                            {
                                value: 'dine_in',
                                label: 'Dine-In',
                                icon: UtensilsCrossed,
                            },
                            {
                                value: 'takeaway',
                                label: 'Takeaway',
                                icon: ShoppingBag,
                            },
                        ] as const
                    ).map(({ value, label, icon: Icon }) => (
                        <Button
                            key={value}
                            type="button"
                            variant="ghost"
                            aria-pressed={orderType === value}
                            onClick={() => onOrderTypeChange(value)}
                            className={cn(
                                'h-11 gap-1.5 rounded-full px-3 text-xs font-semibold',
                                orderType === value
                                    ? 'bg-background text-foreground hover:bg-background shadow-xs'
                                    : 'text-muted-foreground',
                            )}
                        >
                            <Icon className="size-3.5" aria-hidden="true" />
                            {label}
                        </Button>
                    ))}
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    onClick={onOpenHeldOrders}
                    className="ml-auto h-11 shrink-0 gap-1.5 rounded-full px-3 text-xs font-medium sm:order-last"
                    aria-label={`Held orders (${heldCount})`}
                >
                    <PauseCircle
                        className="text-muted-foreground size-4"
                        aria-hidden="true"
                    />
                    Held
                    {heldCount > 0 && (
                        <Badge
                            variant="secondary"
                            className="min-w-5 rounded-full px-1.5 py-0 text-[10px] tabular-nums"
                        >
                            {heldCount}
                        </Badge>
                    )}
                </Button>

                {hasTables && orderType === 'dine_in' && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onOpenTablePicker}
                        className={cn(
                            'h-11 w-full min-w-0 gap-1.5 rounded-full text-xs font-semibold shadow-none sm:w-auto sm:max-w-64',
                            selectedTable
                                ? 'border-primary/20 bg-primary/5 text-primary'
                                : 'text-muted-foreground border-dashed',
                        )}
                        title={
                            selectedTable
                                ? `Table ${selectedTable.name} (${guestCount}p)`
                                : 'Assign Table'
                        }
                    >
                        <UtensilsCrossed
                            className="size-3.5"
                            aria-hidden="true"
                        />
                        <span className="truncate">
                            {selectedTable
                                ? `Table ${selectedTable.name} (${guestCount}p)`
                                : 'Assign Table'}
                        </span>
                    </Button>
                )}
            </div>
        </header>
    );
}
