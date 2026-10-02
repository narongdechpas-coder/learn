import { Suspense } from "react";
import { TarotClient } from "./TarotClient";

export const metadata = { title: "ไพ่ยิปซี | Horoscope Hub" };

export default function Page() {
  return (
    <Suspense>
      <TarotClient />
    </Suspense>
  );
}
