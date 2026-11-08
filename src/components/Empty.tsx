import * as M from "../model";

import { ChartNoAxesCombined } from "lucide-react";
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <ChartNoAxesCombined size={34} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
