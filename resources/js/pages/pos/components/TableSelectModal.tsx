import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Minus, Plus, Users, UtensilsCrossed } from 'lucide-react';

export type FloorData = {
    id: number;
    name: string;
    tables: {
        id: number;
        name: string;
        seats: number;
    }[];
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    floors: FloorData[];
    selectedTable: { id: number; name: string } | null;
    initialGuestCount: number;
    onConfirm: (
        table: { id: number; name: string } | null,
        guestCount: number,
    ) => void;
};

export default function TableSelectModal({
    isOpen,
    onClose,
    floors,
    selectedTable,
    initialGuestCount,
    onConfirm,
}: Props) {
    const [activeFloorId, setActiveFloorId] = useState<number | null>(null);
    const [tempTable, setTempTable] = useState<{
        id: number;
        name: string;
    } | null>(null);
    const [tempGuests, setTempGuests] = useState(1);

    useEffect(() => {
        if (isOpen) {
            setTempTable(selectedTable);
            setTempGuests(Math.max(1, initialGuestCount));
            if (floors.length > 0 && activeFloorId === null) {
                setActiveFloorId(floors[0].id);
            }
        }
    }, [isOpen, selectedTable, initialGuestCount, floors, activeFloorId]);

    const currentFloor =
        floors.find((f) => f.id === activeFloorId) ?? floors[0] ?? null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-lg">
                <DialogHeader className="shrink-0 border-b p-5">
                    <div className="flex items-center gap-2">
                        <UtensilsCrossed className="text-primary size-5" />
                        <DialogTitle className="text-xl font-bold">
                            Select Dining Table
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                    {/* Guest Count Selector */}
                    <div className="bg-muted/40 flex items-center justify-between rounded-xl border p-3.5">
                        <div className="flex items-center gap-2">
                            <Users className="text-muted-foreground size-4" />
                            <div>
                                <Label className="text-sm font-semibold">
                                    Number of Guests
                                </Label>
                                <p className="text-muted-foreground text-xs">
                                    Used for covers & reporting
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="size-9 rounded-lg"
                                onClick={() =>
                                    setTempGuests((g) => Math.max(1, g - 1))
                                }
                                disabled={tempGuests <= 1}
                            >
                                <Minus className="size-3.5" />
                            </Button>
                            <span className="w-8 text-center text-base font-bold tabular-nums">
                                {tempGuests}
                            </span>
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="size-9 rounded-lg"
                                onClick={() =>
                                    setTempGuests((g) => Math.min(50, g + 1))
                                }
                            >
                                <Plus className="size-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Floor Selector Tabs */}
                    {floors.length > 1 && (
                        <div className="flex flex-wrap gap-1.5 border-b pb-2">
                            {floors.map((floor) => {
                                const isActive = currentFloor?.id === floor.id;
                                return (
                                    <button
                                        key={floor.id}
                                        type="button"
                                        onClick={() =>
                                            setActiveFloorId(floor.id)
                                        }
                                        className={cn(
                                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                                            isActive
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'bg-muted/50 hover:bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {floor.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Table Tiles Grid */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                                Available Tables (
                                {currentFloor?.name ?? 'Floor'})
                            </Label>
                            {tempTable && (
                                <button
                                    type="button"
                                    onClick={() => setTempTable(null)}
                                    className="text-primary text-xs font-medium hover:underline"
                                >
                                    Clear selection
                                </button>
                            )}
                        </div>

                        {!currentFloor || currentFloor.tables.length === 0 ? (
                            <div className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
                                No available tables found on this floor.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                                {currentFloor.tables.map((table) => {
                                    const isSelected =
                                        tempTable?.id === table.id;
                                    return (
                                        <button
                                            key={table.id}
                                            type="button"
                                            onClick={() =>
                                                setTempTable({
                                                    id: table.id,
                                                    name: table.name,
                                                })
                                            }
                                            className={cn(
                                                'flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all select-none',
                                                isSelected
                                                    ? 'border-primary bg-primary/10 text-primary ring-primary font-semibold shadow-sm ring-2'
                                                    : 'border-border bg-card hover:bg-muted/40 text-foreground',
                                            )}
                                        >
                                            <span className="text-base font-bold">
                                                {table.name}
                                            </span>
                                            <Badge
                                                variant="secondary"
                                                className="mt-1 text-[10px]"
                                            >
                                                {table.seats} seats
                                            </Badge>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="bg-muted/20 flex shrink-0 items-center gap-2 border-t p-4 sm:justify-between">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            onConfirm(tempTable, tempGuests);
                            onClose();
                        }}
                        className="font-semibold shadow"
                    >
                        {tempTable
                            ? `Confirm Table ${tempTable.name}`
                            : 'Continue Without Table'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
