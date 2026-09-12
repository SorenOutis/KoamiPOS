import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type OrderItem = {
    id: number;
    product_name: string;
    unit_price: string | number;
    quantity: number;
    total: string | number;
};

type Order = {
    id: number;
    subtotal: string | number;
    discount: string | number;
    tax: string | number;
    total: string | number;
    payment_method: string;
    status: string;
    created_at: string;
    items: OrderItem[];
    cashier?: { id: number; name: string; email: string } | null;
};

type Props = {
    order: Order;
    workspace: { id: number; name: string } | null;
};

export default function PosSalesShow({ order, workspace }: Props) {
    return (
        <>
            <Head title={`Receipt #${order.id}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Receipt #{order.id}</h1>
                    <Link href="/pos/sales" className="text-sm underline">
                        Sales history
                    </Link>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {workspace?.name} · {order.cashier?.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 text-sm">
                        {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between">
                                <span>
                                    {item.product_name} × {item.quantity}
                                </span>
                                <span>₱{Number(item.total).toFixed(2)}</span>
                            </div>
                        ))}
                        <div className="mt-2 flex justify-between">
                            <span>Subtotal</span>
                            <span>₱{Number(order.subtotal).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Discount</span>
                            <span>−₱{Number(order.discount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tax (12%)</span>
                            <span>₱{Number(order.tax).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                            <span>Total ({order.payment_method})</span>
                            <span>₱{Number(order.total).toFixed(2)}</span>
                        </div>
                        <Badge className="w-fit">{order.status}</Badge>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

PosSalesShow.layout = {
    breadcrumbs: [
        { title: 'POS', href: '/pos' },
        { title: 'Sales', href: '/pos/sales' },
    ],
};
