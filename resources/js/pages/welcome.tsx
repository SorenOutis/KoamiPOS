import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { dashboard, login, register } from '@/routes';
import { index as posIndex } from '@/routes/pos';
import type { Auth } from '@/types/auth';
import {
    ArrowRight,
    ChefHat,
    LayoutGrid,
    ShoppingBag,
    Store,
} from 'lucide-react';

export default function Welcome() {
    const { auth } = usePage<{ auth: Auth }>().props;

    return (
        <>
            <Head title="Welcome to KoamiPOS" />
            <div className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground flex min-h-screen flex-col">
                {/* Header Nav */}
                <header className="border-border/60 shrink-0 border-b">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                        <div className="flex items-center gap-2.5">
                            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl font-bold shadow-xs">
                                <Store className="size-5" />
                            </div>
                            <span className="text-base font-bold tracking-tight">
                                KoamiPOS
                            </span>
                        </div>

                        <nav className="flex items-center gap-3">
                            {auth?.user ? (
                                <>
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="rounded-full"
                                    >
                                        <Link href={dashboard()}>
                                            Dashboard
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        className="rounded-full font-semibold"
                                    >
                                        <Link href={posIndex()}>
                                            Open POS
                                            <ArrowRight className="ml-1.5 size-4" />
                                        </Link>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        asChild
                                        variant="ghost"
                                        className="rounded-full"
                                    >
                                        <Link href={login()}>Log in</Link>
                                    </Button>
                                    <Button
                                        asChild
                                        className="rounded-full font-semibold"
                                    >
                                        <Link href={register()}>Register</Link>
                                    </Button>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                {/* Hero Section */}
                <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:px-6 sm:py-20">
                    <div className="bg-primary/10 text-primary mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold">
                        <span className="bg-primary size-2 animate-pulse rounded-full" />
                        Universal Modular Point of Sale
                    </div>

                    <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                        A fast, tactile POS crafted for modern commerce.
                    </h1>

                    <p className="text-muted-foreground mt-4 max-w-2xl text-base sm:text-lg">
                        Engineered for cafes, restaurants, and retail. Built
                        with multi-tenant workspaces, offline resilience,
                        lightning-fast barcode scanning, and kitchen display
                        systems.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        {auth?.user ? (
                            <Button
                                asChild
                                size="lg"
                                className="h-12 rounded-2xl px-6 text-base font-bold shadow-md"
                            >
                                <Link href={posIndex()}>
                                    Launch Terminal
                                    <ArrowRight className="ml-2 size-5" />
                                </Link>
                            </Button>
                        ) : (
                            <>
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-12 rounded-2xl px-6 text-base font-bold shadow-md"
                                >
                                    <Link href={login()}>
                                        Sign In to Register
                                        <ArrowRight className="ml-2 size-5" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="outline"
                                    className="h-12 rounded-2xl px-6 text-base"
                                >
                                    <Link href={register()}>
                                        Create Account
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Features Grid */}
                    <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3 sm:gap-6">
                        <div className="bg-card border-border/60 rounded-3xl border p-5 shadow-xs">
                            <div className="bg-primary/10 text-primary mb-3 flex size-10 items-center justify-center rounded-2xl">
                                <ShoppingBag className="size-5" />
                            </div>
                            <h2 className="text-foreground text-sm font-bold">
                                Fast POS Terminal
                            </h2>
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                Barcode buffer, modifier configuration, quick
                                cash presets, and multi-tender split billing.
                            </p>
                        </div>

                        <div className="bg-card border-border/60 rounded-3xl border p-5 shadow-xs">
                            <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <ChefHat className="size-5" />
                            </div>
                            <h2 className="text-foreground text-sm font-bold">
                                Kitchen Display (KDS)
                            </h2>
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                Real-time ticket escalation with elapsed time
                                tracking, prep notes, and one-tap bump workflow.
                            </p>
                        </div>

                        <div className="bg-card border-border/60 rounded-3xl border p-5 shadow-xs">
                            <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <LayoutGrid className="size-5" />
                            </div>
                            <h2 className="text-foreground text-sm font-bold">
                                Floor & Table Management
                            </h2>
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                Multi-floor visual layouts, occupancy statuses,
                                covers tracking, and instant dining orders.
                            </p>
                        </div>
                    </div>
                </main>

                <footer className="border-border/60 text-muted-foreground shrink-0 border-t py-6 text-center text-xs">
                    KoamiPOS · Universal Open-Source Point of Sale
                </footer>
            </div>
        </>
    );
}
