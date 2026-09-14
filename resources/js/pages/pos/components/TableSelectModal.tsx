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
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-5 border-b shrink-0">
                    <div className="flex items-center gap-2">
                        <UtensilsCrossed className="size-5 text-primary" />
                        <DialogTitle className="text-xl font-bold">
                            Select Dining Table
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Guest Count Selector */}
                    <div className="flex items-center justify-between bg-muted/40 p-3.5 rounded-xl border">
                        <div className="flex items-center gap-2">
                            <Users className="size-4 text-muted-foreground" />
                            <div>
                                <Label className="text-sm font-semibold">
                                    Number of Guests
                                </Label>
                                <p className="text-xs text-muted-foreground">
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
                            <span className="w-8 text-center font-bold text-base tabular-nums">
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
                                            'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
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
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Available Tables ({currentFloor?.name ?? 'Floor'})
                            </Label>
                            {tempTable && (
                                <button
                                    type="button"
                                    onClick={() => setTempTable(null)}
                                    className="text-xs text-primary hover:underline font-medium"
                                >
                                    Clear selection
                                </button>
                            )}
                        </div>

                        {!currentFloor || currentFloor.tables.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm border rounded-xl border-dashed">
                                No available tables found on this floor.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
                                                'flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center select-none',
                                                isSelected
                                                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary font-semibold shadow-sm'
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

                <DialogFooter className="p-4 border-t bg-muted/20 shrink-0 flex sm:justify-between items-center gap-2">
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
