import type { Gender, PartialDate } from "@/types";

export const genderLabel: Record<Gender, string> = {
  male: "Nam",
  female: "Nữ",
  unknown: "Không rõ",
};

/** Vietnamese sibling-ordinal convention: eldest is "thứ 2", then 3, 4, ... — there's no
 * "thứ nhất", so any value under 2 is nonsensical and shouldn't reach this function. */
export function siblingOrderLabel(order?: number): string {
  if (order === undefined) return "Chưa rõ / con một";
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
