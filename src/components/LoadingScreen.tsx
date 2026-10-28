import { Bloom } from "./Bloom";

export function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-mark">
        <Bloom size={26} variant={0} bare />
      </div>
      <p className="text-[12px] tracking-wide">باغ امروز در حال باز شدن است…</p>
    </div>
  );
}
