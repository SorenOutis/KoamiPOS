import type { PosProduct } from '@/components/ProductTile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { HeldOrder } from '@/hooks/use-pos-cart';
import { ArrowLeft, Clock, PauseCircle, Trash2 } from 'lucide-react';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    heldOrders: HeldOrder[];
    products: PosProduct[];
    currencySymbol: string;
    onRecall: (id: string) => void;
    onDelete: (id: string) => void;
};

export default function HoldOrdersModal({
    isOpen,
    onClose,
    heldOrders,
    products,
    currencySymbol,
    onRecall,
    onDelete,
}: Props) {
    const productsMap = new Map(products.map((p) => [p.id, p]));

    function calculateTotal(order: HeldOrder): number {
        return order.items.reduce((sum, item) => {
            const product = productsMap.get(item.productId);
            const basePrice = product ? Number(product.price) : 0;
            const modDelta = item.modifiers.reduce(
                (mSum, m) => mSum + m.price_delta,
                0,
            );
            return sum + (basePrice + modDelta) * item.quantity;
        }, 0);
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-card [&_button]:focus-visible:outline-ring flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-xl [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:focus-visible:outline-2 [&>button:last-child]:top-2 [&>button:last-child]:right-2 [&>button:last-child]:flex [&>button:last-child]:size-11 [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:rounded-full">
                <DialogHeader className="border-border/60 max-h-[35dvh] shrink-0 overflow-y-auto border-b p-4 pr-14 text-left sm:p-5 sm:pr-16">
                    <div className="flex flex-wrap items-center gap-2">
                        <PauseCircle className="text-primary size-5" />
                        <DialogTitle className="text-lg leading-snug font-semibold">
                            Held Orders
                        </DialogTitle>
                        <Badge variant="secondary" className="ml-auto">
                            {heldOrders.length} held
                        </Badge>
                    </div>
                    <DialogDescription className="text-xs">
                        Resume a saved order when your guest is ready.
                    </DialogDescription>
                </DialogHeader>

                <div className="divide-border/60 min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain p-4 sm:p-5">
                    {heldOrders.length === 0 ? (
                        <div className="text-muted-foreground bg-muted/30 rounded-2xl px-4 py-12 text-center text-sm">
                            <Clock className="mx-auto mb-2 size-8 opacity-40" />
                            No parked orders currently held.
                        </div>
                    ) : (
                        heldOrders.map((order) => {
                            const total = calculateTotal(order);
                            const totalUnits = order.items.reduce(
                                (sum, i) => sum + i.quantity,
                                0,
                            );

                            return (
                                <div
                                    key={order.id}
                                    className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                                >
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-foreground text-base font-semibold break-words">
                                                {order.label}
                                            </span>
                                            {order.tableName && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[11px]"
                                                >
                                                    {order.tableName}
                                                </Badge>
                                            )}
                                            <Badge
                                                variant="secondary"
                                                className="font-mono text-[10px] uppercase"
                                            >
                                                {order.orderType?.replace(
                                                    '_',
                                                    ' ',
                                                )}
                                            </Badge>
                                        </div>

                                        <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                                            <span>
                                                Parked at {order.heldAt}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                {totalUnits} item
                                                {totalUnits === 1 ? '' : 's'}
                                            </span>
                                            {order.discountCode && (
                                                <>
                                                    <span>•</span>
                                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                        Code:{' '}
                                                        {order.discountCode}
                                                    </span>
                                                </>
                                            )}
                                        </p>

                                        <p className="text-foreground pt-1 text-sm font-semibold">
                                            Total: {currencySymbol}
                                            {total.toFixed(2)}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => onDelete(order.id)}
                                            title="Discard order"
                                            aria-label={`Discard held order ${order.label}`}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                                onRecall(order.id);
                                                onClose();
                                            }}
                                            aria-label={`Resume held order ${order.label}`}
                                            className="h-11 gap-1.5 rounded-xl font-semibold"
                                        >
                                            <ArrowLeft className="size-3.5" />
                                            Resume Order
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <DialogFooter className="bg-muted/30 border-border/60 max-h-[30dvh] shrink-0 flex-col gap-2 overflow-y-auto border-t p-4 sm:flex-row sm:justify-between [&>button]:w-full [&>button]:rounded-xl sm:[&>button]:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="w-full sm:w-auto"
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
