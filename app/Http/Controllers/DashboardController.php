<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $workspaceId = $user->workspace_id;

        $today = null;
        $lowStockCount = null;
        $recentOrders = [];

        if ($workspaceId) {
            $today = DB::table('orders')
                ->where('orders.workspace_id', $workspaceId)
                ->where('orders.status', 'completed')
                ->whereDate('orders.created_at', today())
                ->selectRaw('COALESCE(SUM(total), 0) as revenue, COUNT(*) as count')
                ->first();

            $recentOrders = DB::table('orders')
                ->where('orders.workspace_id', $workspaceId)
                ->where('orders.status', 'completed')
                ->orderByDesc('orders.created_at')
                ->limit(5)
                ->get([
                    'orders.id',
                    'orders.cashier_id',
                    'orders.subtotal',
                    'orders.discount',
                    'orders.tax',
                    'orders.total',
                    'orders.payment_method',
                    'orders.created_at',
                ]);

            $lowStockCount = Product::forWorkspace($workspaceId)
                ->active()
                ->lowStock()
                ->count();

            $recentActivity = DB::table('orders')
                ->where('orders.workspace_id', $workspaceId)
                ->where('orders.status', 'completed')
                ->orderByDesc('orders.created_at')
                ->limit(3)
                ->join('users', 'orders.cashier_id', '=', 'users.id')
                ->select(
                    'orders.id',
                    'orders.subtotal',
                    'orders.discount',
                    'orders.total',
                    'orders.payment_method',
                    'orders.created_at',
                    'users.name as cashier_name',
                )
                ->get();
        } else {
            $recentActivity = [];
        }

        $avgTicket = null;
        if ($today && $today->count > 0) {
            $avgTicket = round($today->revenue / $today->count, 2);
        }

        return Inertia::render('dashboard', [
            'today' => $today
                ? [
                    'revenue' => (float) $today->revenue,
                    'count' => (int) $today->count,
                    'avgTicket' => $avgTicket,
                ]
                : null,
            'lowStockCount' => $lowStockCount,
            'recentOrders' => $recentOrders,
            'recentActivity' => $recentActivity,
        ]);
    }
}
