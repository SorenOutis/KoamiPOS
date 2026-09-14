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
            <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-5 border-b shrink-0">
                    <div className="flex items-center gap-2">
                        <PauseCircle className="size-5 text-primary" />
                        <DialogTitle className="text-xl font-bold">
                            Parked / Held Orders
                        </DialogTitle>
                        <Badge variant="secondary" className="ml-auto">
                            {heldOrders.length} held
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {heldOrders.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl border-dashed">
                            <Clock className="size-8 mx-auto mb-2 opacity-40" />
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
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors shadow-sm"
                                >
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-base text-foreground">
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
                                                className="text-[10px] uppercase font-mono"
                                            >
                                                {order.orderType?.replace('_', ' ')}
                                            </Badge>
                                        </div>

                                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                                            <span>Parked at {order.heldAt}</span>
                                            <span>•</span>
                                            <span>
                                                {totalUnits} item
                                                {totalUnits === 1 ? '' : 's'}
                                            </span>
                                            {order.discountCode && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-emerald-600 font-medium">
                                                        Code: {order.discountCode}
                                                    </span>
                                                </>
                                            )}
                                        </p>

                                        <p className="text-sm font-semibold text-foreground pt-1">
                                            Total: {currencySymbol}
                                            {total.toFixed(2)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
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
                                            className="font-semibold gap-1.5"
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

                <DialogFooter className="p-4 border-t bg-muted/20 shrink-0">
                    <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
