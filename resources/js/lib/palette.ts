export const TINT_PALETTES = [
    {
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-800 dark:text-amber-300',
        border: 'border-amber-500/20',
    },
    {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-800 dark:text-emerald-300',
        border: 'border-emerald-500/20',
    },
    {
        bg: 'bg-sky-500/10 dark:bg-sky-500/20',
        text: 'text-sky-800 dark:text-sky-300',
        border: 'border-sky-500/20',
    },
    {
        bg: 'bg-violet-500/10 dark:bg-violet-500/20',
        text: 'text-violet-800 dark:text-violet-300',
        border: 'border-violet-500/20',
    },
    {
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        text: 'text-rose-800 dark:text-rose-300',
        border: 'border-rose-500/20',
    },
    {
        bg: 'bg-orange-500/10 dark:bg-orange-500/20',
        text: 'text-orange-800 dark:text-orange-300',
        border: 'border-orange-500/20',
    },
    {
        bg: 'bg-teal-500/10 dark:bg-teal-500/20',
        text: 'text-teal-800 dark:text-teal-300',
        border: 'border-teal-500/20',
    },
    {
        bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
        text: 'text-indigo-800 dark:text-indigo-300',
        border: 'border-indigo-500/20',
    },
] as const;

export function getStringTint(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % TINT_PALETTES.length;
    return TINT_PALETTES[index];
}
