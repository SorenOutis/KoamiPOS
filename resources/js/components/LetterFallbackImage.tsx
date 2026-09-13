import { useState, useRef, useLayoutEffect } from 'react';

interface Props {
    src?: string | null;
    alt: string;
    size?: number;
    className?: string;
    fallbackClassName?: string;
}

type LoadState = 'loading' | 'ready' | 'failed';

export default function LetterFallbackImage({
    src,
    alt,
    size = 48,
    className = '',
    fallbackClassName = '',
}: Props) {
    const [loadState, setLoadState] = useState<LoadState>('loading');
    const [imgSize, setImgSize] = useState(size);
    const imgRef = useRef<HTMLImageElement>(null);
    const lastSrcRef = useRef(src);

    // Reset the load state when a different image is requested so a
    // previously broken src does not hide a newly loaded one.
    if (lastSrcRef.current !== src) {
        lastSrcRef.current = src;
        setLoadState('loading');
    }

    const showFallback = !src || loadState === 'failed';

    useLayoutEffect(() => {
        const el = imgRef.current;
        if (!el) {
            return;
        }
        const update = () => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setImgSize(Math.round(Math.min(rect.width, rect.height)));
            }
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [size, showFallback]);

    const initials =
        alt
            .split(/[\s_-]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((segment) => segment.at(0)?.toUpperCase() ?? '')
            .join('') || '?';

    const letterFallback = (
        <div
            className={`bg-muted text-muted-foreground flex items-center justify-center rounded-full text-[10px] leading-none font-semibold ${fallbackClassName}`}
            style={{
                width: imgSize,
                height: imgSize,
                minWidth: size,
                minHeight: size,
            }}
        >
            {initials}
        </div>
    );

    if (!src || loadState === 'failed') {
        return letterFallback;
    }

    return (
        <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={`rounded-full object-cover ${className}`}
            style={{
                width: imgSize,
                height: imgSize,
                minWidth: size,
                minHeight: size,
            }}
            onLoad={() => setLoadState('ready')}
            onError={() => setLoadState('failed')}
        />
    );
}
