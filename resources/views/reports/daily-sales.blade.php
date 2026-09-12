<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Daily Sales Report</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 0; }
        .meta { color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; }
        th { background: #f3f4f6; text-align: left; }
        td.num, th.num { text-align: right; }
        h2 { font-size: 15px; margin: 18px 0 8px; }
    </style>
</head>
<body>
    <h1>Daily Sales Report</h1>
    <div class="meta">
        {{ $workspaceName ?? 'All workspaces' }} |
        {{ $filters['date_from'] ?? '' }} to {{ $filters['date_to'] ?? '' }} |
        Status: {{ $filters['status'] ?? 'completed' }}
    </div>

    <h2>Totals</h2>
    <table>
        <tr><th>Orders</th><th>Subtotal</th><th>Discount</th><th>Tax</th><th>Total</th><th>Avg. order</th></tr>
        <tr>
            <td class="num">{{ $totals['orders_count'] }}</td>
            <td class="num">{{ number_format($totals['subtotal'], 2) }}</td>
            <td class="num">{{ number_format($totals['discount'], 2) }}</td>
            <td class="num">{{ number_format($totals['tax'], 2) }}</td>
            <td class="num">{{ number_format($totals['total'], 2) }}</td>
            <td class="num">{{ number_format($totals['avg_total'], 2) }}</td>
        </tr>
    </table>

    <h2>Daily breakdown</h2>
    <table>
        <tr><th>Date</th><th class="num">Orders</th><th class="num">Subtotal</th><th class="num">Discount</th><th class="num">Tax</th><th class="num">Total</th></tr>
        @foreach ($daily as $row)
            <tr>
                <td>{{ $row['date'] }}</td>
                <td class="num">{{ $row['orders_count'] }}</td>
                <td class="num">{{ number_format($row['subtotal'], 2) }}</td>
                <td class="num">{{ number_format($row['discount'], 2) }}</td>
                <td class="num">{{ number_format($row['tax'], 2) }}</td>
                <td class="num">{{ number_format($row['total'], 2) }}</td>
            </tr>
        @endforeach
    </table>

    <h2>Cashiers</h2>
    <table>
        <tr><th>Cashier</th><th class="num">Orders</th><th class="num">Total</th></tr>
        @foreach ($byCashier as $row)
            <tr><td>{{ $row['cashier_name'] }}</td><td class="num">{{ $row['orders_count'] }}</td><td class="num">{{ number_format($row['total'], 2) }}</td></tr>
        @endforeach
    </table>

    <h2>Payments</h2>
    <table>
        <tr><th>Method</th><th class="num">Orders</th><th class="num">Total</th></tr>
        @foreach ($byPayment as $row)
            <tr><td>{{ $row['payment_method'] }}</td><td class="num">{{ $row['orders_count'] }}</td><td class="num">{{ number_format($row['total'], 2) }}</td></tr>
        @endforeach
    </table>

    <h2>Top products</h2>
    <table>
        <tr><th>Product</th><th class="num">Qty</th><th class="num">Revenue</th></tr>
        @foreach ($byProduct as $row)
            <tr><td>{{ $row['product_name'] }}</td><td class="num">{{ $row['quantity'] }}</td><td class="num">{{ number_format($row['revenue'], 2) }}</td></tr>
        @endforeach
    </table>
</body>
</html>
