// Recipient view of a cancelled gift: warm, brief, no details of what it was.
import { GiftHeader } from "./gift-ui";
import { BowMark, Screen } from "./ui";

export function CancelledScreen({ giverName }: { giverName: string }) {
  return (
    <Screen theme="gift">
      <GiftHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pb-10 text-center">
        <span className="pop flex h-20 w-20 items-center justify-center rounded-full bg-clay-tint text-clay"><BowMark size={34} /></span>
        <h1 className="rise font-display text-[28px] font-semibold leading-[34px] text-gift-text">This gift is no longer available</h1>
        <p className="rise max-w-[320px] text-[14px] leading-5 text-gift-text2" style={{ "--d": "90ms" } as React.CSSProperties}>
          {giverName} has withdrawn this link. Nothing was charged, and you don’t need to do anything.
        </p>
      </main>
    </Screen>
  );
}
