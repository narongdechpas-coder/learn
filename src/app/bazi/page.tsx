import { Suspense } from "react";
import { BaziClient } from "./BaziClient";

export const metadata = { title: "ปาจื้อ (Bazi) | Horoscope Hub" };

export default function Page() {
  return (
    <Suspense>
      <BaziClient />
    </Suspense>
  );
}
