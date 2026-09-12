<?php

namespace App\Services\Reports;

use League\Csv\Writer;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SalesReportExport
{
    public function __construct(protected SalesReportService $reports = new SalesReportService) {}

    /**
     * @param  array{workspace_id?: int|null, date_from?: string|null, date_to?: string|null, cashier_id?: int|null, payment_method?: string|null, status?: string|string[]|null}  $filters
     */
    public function dailyCsvResponse(array $filters, string $filename = 'daily-sales.csv'): StreamedResponse
    {
        $rows = $this->reports->daily($filters);

        return response()->streamDownload(function () use ($rows): void {
            $csv = Writer::createFromFileObject(new \SplTempFileObject);
            $csv->insertOne(['Date', 'Orders', 'Subtotal', 'Discount', 'Tax', 'Total']);
            foreach ($rows as $row) {
                $csv->insertOne([
                    $row['date'],
                    $row['orders_count'],
                    number_format($row['subtotal'], 2, '.', ''),
                    number_format($row['discount'], 2, '.', ''),
                    number_format($row['tax'], 2, '.', ''),
                    number_format($row['total'], 2, '.', ''),
                ]);
            }
            echo $csv->toString();
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /**
     * @param  array{workspace_id?: int|null, date_from?: string|null, date_to?: string|null, cashier_id?: int|null, payment_method?: string|null, status?: string|string[]|null}  $filters
     */
    public function dailyXlsxResponse(array $filters, string $filename = 'daily-sales.xlsx'): StreamedResponse
    {
        $rows = $this->reports->daily($filters);

        $writer = app(XlsxWriter::class);

        return response()->streamDownload(function () use ($writer, $rows, $filename): void {
            $writer->openToBrowser($filename);
            $writer->addRow(Row::fromValues(['Date', 'Orders', 'Subtotal', 'Discount', 'Tax', 'Total']));

            foreach ($rows as $row) {
                $writer->addRow(Row::fromValues([
                    $row['date'],
                    $row['orders_count'],
                    $row['subtotal'],
                    $row['discount'],
                    $row['tax'],
                    $row['total'],
                ]));
            }

            $writer->close();
        }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }

    /**
     * @param  array{workspace_id?: int|null, date_from?: string|null, date_to?: string|null, cashier_id?: int|null, payment_method?: string|null, status?: string|string[]|null}  $filters
     */
    public function ordersCsvResponse(array $filters, string $filename = 'orders.csv'): StreamedResponse
    {
        $service = $this->reports;

        return response()->streamDownload(function () use ($service, $filters): void {
            $csv = Writer::createFromFileObject(new \SplTempFileObject);
            $csv->insertOne(['ID', 'Date', 'Cashier', 'Payment', 'Status', 'Subtotal', 'Discount', 'Tax', 'Total']);

            $service->baseQuery($filters)->with('cashier')->orderBy('orders.created_at')->chunk(500, function ($orders) use ($csv): void {
                foreach ($orders as $order) {
                    $csv->insertOne([
                        $order->id,
                        $order->created_at?->toDateTimeString(),
                        $order->cashier?->name,
                        $order->payment_method,
                        $order->status,
                        $order->subtotal,
                        $order->discount,
                        $order->tax,
                        $order->total,
                    ]);
                }
            });

            echo $csv->toString();
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
