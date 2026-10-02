import { Suspense } from "react";
import { PlayingCardsClient } from "./PlayingCardsClient";

export const metadata = { title: "ไพ่ป๊อก | Horoscope Hub" };

export default function Page() {
  return (
    <Suspense>
      <PlayingCardsClient />
    </Suspense>
  );
}
