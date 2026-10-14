"use client";

import { useId, useMemo, useState } from "react";
import { Poster } from "@/components/Poster";
import type { Dictionary } from "@/lib/dictionaries";
import { describePoster } from "@/lib/poster/describe";
import { generatePoster } from "@/lib/poster/generate";
import { FLAVORS, type Flavor, type PosterInput } from "@/lib/poster/types";

type Props = {
  /** The English cocktail data the page's poster is generated from. */
  input: PosterInput;
  strings: Dictionary["playground"];
  posterStrings: Dictionary["poster"];
  /** Ingredient names in the page's language, for the alt text. */
  ingredientNames: [id: string, name: string][];
};

// Flavor sliders that regenerate the poster live. The poster itself comes
// from the same generatePoster the server uses; only the flavor changes.
export function PosterPlayground({ input, strings, posterStrings, ingredientNames }: Props) {
  const id = useId();
  const [flavor, setFlavor] = useState(input.flavor);
  // Announced by a live region. Cleared on every change so a second reset is announced again.
  const [status, setStatus] = useState("");

  const spec = useMemo(() => generatePoster({ ...input, flavor }), [input, flavor]);
  const names = useMemo(() => new Map(ingredientNames), [ingredientNames]);
  const label = useMemo(() => describePoster(spec, posterStrings, names), [spec, posterStrings, names]);
  const changed = FLAVORS.some((name) => flavor[name] !== input.flavor[name]);

  const update = (name: Flavor, value: number) => {
    setFlavor((current) => ({ ...current, [name]: value }));
    setStatus("");
  };

  const reset = () => {
    setFlavor(input.flavor);
    setStatus(strings.resetDone);
  };

  const download = async () => {
    // Loaded on demand, so the page doesn't ship a server renderer up front.
    const { renderToStaticMarkup } = await import("react-dom/server");
    const markup = renderToStaticMarkup(<Poster spec={spec} label={label} />);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${markup}\n`], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nhau-${input.slug}${changed ? "-remix" : ""}.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="mt-8 grid gap-10 md:grid-cols-12 md:gap-12">
      <div className="md:col-span-5">
        <div className="mx-auto max-w-[420px] bg-poster shadow-[var(--poster-shadow)]">
          <Poster spec={spec} label={label} idPrefix={`${spec.id}-playground`} live morph className="block h-auto w-full" />
        </div>
      </div>

      <div className="md:col-span-7">
        <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {FLAVORS.map((name) => {
            const inputId = `${id}-${name}`;
            const value = flavor[name];
            return (
              <div key={name}>
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor={inputId} className="text-label uppercase text-accent">
                    {strings.flavors[name]}
                  </label>
                  {/* The slider announces its own value; this is the visible copy. */}
                  <span aria-hidden="true" className="font-serif text-lg lining-nums tabular-nums">
                    {value}
                  </span>
                </div>
                <input
                  id={inputId}
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={value}
                  aria-valuetext={strings.value.replace("{value}", String(value))}
                  onChange={(event) => update(name, Number(event.target.value))}
                  className="mt-2 h-6 w-full cursor-pointer accent-accent"
                />
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="border border-border px-5 py-2 text-ui transition-colors hover:border-accent hover:text-accent"
          >
            {strings.reset}
          </button>
          <button
            type="button"
            onClick={download}
            className="border border-accent bg-accent px-5 py-2 text-ui text-bg transition-colors hover:bg-transparent hover:text-accent"
          >
            {strings.download}
          </button>
        </div>
        <p role="status" className="sr-only">
          {status}
        </p>
      </div>
    </div>
  );
}
