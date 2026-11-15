"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StoreImage } from "@/components/shared/store-image";
import { cn } from "@/lib/utils";

type Img = { key: string; alt: string | null };

export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  function goTo(i: number) {
    const next = (i + images.length) % images.length;
    setIndex(next);
    track.current?.scrollTo({ left: next * track.current.clientWidth, behavior: "smooth" });
  }

  if (!images.length) {
    return <div className="aspect-square overflow-hidden rounded-3xl border bg-white"><StoreImage imageKey={null} alt={name} /></div>;
  }

  return (
    <div className="flex min-w-0 flex-col-reverse gap-3 lg:flex-row">
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto scrollbar-none lg:max-h-[560px] lg:flex-col lg:overflow-y-auto">
          {images.map((img, i) => (
            <button
              key={img.key}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Image ${i + 1}`}
              aria-current={i === index}
              className={cn("relative size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition sm:size-20", i === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100")}
            >
              <StoreImage imageKey={img.key} alt="" fill sizes="80px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="relative min-w-0 flex-1">
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== index) setIndex(i);
          }}
          className="flex aspect-square snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-3xl border bg-white scrollbar-none"
        >
          {images.map((img, i) => (
            <div key={img.key} className="relative size-full shrink-0 snap-center">
              <StoreImage
                imageKey={img.key}
                alt={img.alt ?? `${name} — image ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-contain p-6 sm:p-10"
              />
            </div>
          ))}
        </div>
        {images.length > 1 ? (
          <>
            <button type="button" onClick={() => goTo(index - 1)} className="absolute start-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 shadow-sm hover:bg-background sm:flex" aria-label="Image précédente">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => goTo(index + 1)} className="absolute end-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 shadow-sm hover:bg-background sm:flex" aria-label="Image suivante">
              <ChevronRight className="size-5" />
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden">
              {images.map((img, i) => (
                <span key={img.key} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-primary" : "w-1.5 bg-foreground/20")} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
