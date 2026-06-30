"use client";

import {
  MIN_LOW_PASS_HZ,
  MAX_LOW_PASS_HZ,
  SHELF_GAIN_RANGE_DB,
  DEFAULT_LOW_PASS_HZ,
  DEFAULT_LOW_SHELF_DB,
  DEFAULT_HIGH_SHELF_DB,
} from "@/lib/audioEngine";

interface Props {
  open: boolean;
  lowPass: number;
  lowShelf: number;
  highShelf: number;
  onLowPassChange: (hz: number) => void;
  onLowShelfChange: (db: number) => void;
  onHighShelfChange: (db: number) => void;
  onReset: () => void;
}

/**
 * Map a 0..1 linear slider position to a logarithmic Hz value so the slider
 * feels natural across the full hearing range — equal steps cover roughly
 * one octave each rather than packing everything into the top.
 */
const sliderToHz = (s: number) => {
  const minLog = Math.log10(MIN_LOW_PASS_HZ);
  const maxLog = Math.log10(MAX_LOW_PASS_HZ);
  return Math.round(Math.pow(10, minLog + s * (maxLog - minLog)));
};

const hzToSlider = (hz: number) => {
  const minLog = Math.log10(MIN_LOW_PASS_HZ);
  const maxLog = Math.log10(MAX_LOW_PASS_HZ);
  return (Math.log10(hz) - minLog) / (maxLog - minLog);
};

const formatHz = (hz: number) => {
  if (hz >= MAX_LOW_PASS_HZ - 1) return "Off";
  if (hz >= 1000) return `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)} kHz`;
  return `${hz} Hz`;
};

const formatDb = (db: number) => {
  if (db === 0) return "0 dB";
  return `${db > 0 ? "+" : "−"}${Math.abs(db).toFixed(0)} dB`;
};

const isDefault = (lp: number, ls: number, hs: number) =>
  lp === DEFAULT_LOW_PASS_HZ &&
  ls === DEFAULT_LOW_SHELF_DB &&
  hs === DEFAULT_HIGH_SHELF_DB;

export function SoundTuner({
  open,
  lowPass,
  lowShelf,
  highShelf,
  onLowPassChange,
  onLowShelfChange,
  onHighShelfChange,
  onReset,
}: Props) {
  if (!open) return null;

  const dirty = !isDefault(lowPass, lowShelf, highShelf);

  return (
    <div
      className="above-veil fixed inset-x-0 z-40 px-3 pb-1"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.25rem)",
      }}
    >
      <div className="mx-auto max-w-2xl rounded-2xl glass-strong px-4 py-3 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/55">
            Tune
          </span>
          <button
            type="button"
            onClick={onReset}
            disabled={!dirty}
            className="text-[11px] font-medium tracking-tight text-white/70 transition-opacity hover:text-white disabled:opacity-30"
          >
            Reset
          </button>
        </div>

        <TuneRow
          label="Brightness"
          unit="Hz"
          display={formatHz(lowPass)}
          min={0}
          max={1}
          step={0.001}
          sliderValue={hzToSlider(lowPass)}
          onSliderChange={(s) => onLowPassChange(sliderToHz(s))}
          hint={lowPass >= MAX_LOW_PASS_HZ - 1 ? "Full range" : "Low-pass cutoff"}
        />

        <TuneRow
          label="Bass"
          unit="dB @ 250 Hz"
          display={formatDb(lowShelf)}
          min={-SHELF_GAIN_RANGE_DB}
          max={SHELF_GAIN_RANGE_DB}
          step={1}
          sliderValue={lowShelf}
          onSliderChange={onLowShelfChange}
        />

        <TuneRow
          label="Treble"
          unit="dB @ 4 kHz"
          display={formatDb(highShelf)}
          min={-SHELF_GAIN_RANGE_DB}
          max={SHELF_GAIN_RANGE_DB}
          step={1}
          sliderValue={highShelf}
          onSliderChange={onHighShelfChange}
        />
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  unit: string;
  display: string;
  min: number;
  max: number;
  step: number;
  sliderValue: number;
  onSliderChange: (v: number) => void;
  hint?: string;
}

function TuneRow({
  label,
  unit,
  display,
  min,
  max,
  step,
  sliderValue,
  onSliderChange,
  hint,
}: RowProps) {
  // Visual fill percentage of the slider track.
  const pct = ((sliderValue - min) / (max - min)) * 100;

  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-medium text-white/90">{label}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-white/40">
            {unit}
          </span>
        </div>
        <span className="text-[12px] font-mono tabular-nums text-white/80">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(e) => onSliderChange(Number(e.target.value))}
        aria-label={label}
        className="soothr-slider"
        style={{ ["--val" as string]: `${pct}%` } as React.CSSProperties}
      />
      {hint && (
        <p className="mt-0.5 text-[10px] text-white/35">{hint}</p>
      )}
    </div>
  );
}
