import { Suspense } from "react";
import { ThaiSevenClient } from "./ThaiSevenClient";

export const metadata = { title: "เลข 7 ตัว | Horoscope Hub" };

export default function Page() {
  return (
    <Suspense>
      <ThaiSevenClient />
    </Suspense>
  );
}
