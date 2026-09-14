import type { PosProduct } from '@/components/ProductTile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
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
            <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-xl">
                <DialogHeader className="shrink-0 border-b p-5">
                    <div className="flex items-center gap-2">
                        <PauseCircle className="text-primary size-5" />
                        <DialogTitle className="text-xl font-bold">
                            Parked / Held Orders
                        </DialogTitle>
                        <Badge variant="secondary" className="ml-auto">
                            {heldOrders.length} held
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                    {heldOrders.length === 0 ? (
                        <div className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
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
                                    className="bg-card hover:border-primary/50 flex flex-col justify-between gap-3 rounded-xl border p-4 shadow-sm transition-colors sm:flex-row sm:items-center"
                                >
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-foreground text-base font-bold">
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

                                        <p className="text-muted-foreground flex items-center gap-2 text-xs">
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
                                                    <span className="font-medium text-emerald-600">
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
                                            className="gap-1.5 font-semibold"
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

                <DialogFooter className="bg-muted/20 shrink-0 border-t p-4">
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
