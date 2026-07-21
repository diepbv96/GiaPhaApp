import type { Gender, PartialDate } from "@/types";

export const genderLabel: Record<Gender, string> = {
  male: "Nam",
  female: "Nữ",
  unknown: "Không rõ",
};

/** Vietnamese sibling-ordinal convention: eldest is "thứ 2", then 3, 4, ... — there's no
 * "thứ nhất", so any value under 2 is nonsensical and shouldn't reach this function.
 * Position 2 (the eldest) gets a gender-specific "Trưởng" label instead of a plain number. */
export function siblingOrderLabel(order: number | undefined, gender: Gender): string {
  if (order === undefined) return "Chưa rõ / con một";
  if (order === 2) {
    if (gender === "male") return "Con Trai Trưởng";
    if (gender === "female") return "Con Gái Trưởng";
    return "Con Trưởng";
  }
  return `Con thứ ${order}`;
}

export function formatPartialDate(date?: PartialDate): string {
  if (!date) return "Không rõ";

  const [year, month, day] = date.value.split("-");
  switch (date.precision) {
    case "day":
      return `${day}/${month}/${year}`;
    case "month":
      return `${month}/${year}`;
    case "year":
      return year;
    default:
      return "Không rõ";
  }
}
