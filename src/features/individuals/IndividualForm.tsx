import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createIndividual,
  updateIndividual,
  uploadAvatar,
  type IndividualInput,
} from "@/features/individuals/individualService";
import { createRelationship, type RelationshipInput } from "@/features/relationships/relationshipService";
import { individualFormSchema, type IndividualFormValues } from "@/features/individuals/individualValidation";
import { denormalizeDate, normalizeDate } from "@/features/individuals/dateNormalization";
import { siblingOrderLabel } from "@/lib/formatters";
import { useToast } from "@/app/ToastProvider";
import type { DatePrecision, Individual } from "@/types";

type FormValues = IndividualFormValues;

export interface IndividualFormProps {
  treeId: string;
  initialIndividual?: Individual;
  /** Everyone already in the tree — used only to offer a "link to" picker when creating. */
  existingIndividuals?: Individual[];
  onSuccess: (individual: Individual) => void;
  onCancel: () => void;
}

type LinkRelationshipOption = "parent_of_selected" | "child_of_selected" | "spouse" | "sibling";

const linkRelationshipLabel: Record<LinkRelationshipOption, string> = {
  parent_of_selected: "Là cha/mẹ của người này",
  child_of_selected: "Là con của người này",
  spouse: "Là vợ/chồng của người này",
  sibling: "Là anh/chị/em của người này",
};

function buildLinkRelationshipInput(
  treeId: string,
  newIndividualId: string,
  existingIndividualId: string,
  option: LinkRelationshipOption,
): RelationshipInput {
  switch (option) {
    case "parent_of_selected":
      return { familyTreeId: treeId, type: "parent_child", personAId: newIndividualId, personBId: existingIndividualId };
    case "child_of_selected":
      return { familyTreeId: treeId, type: "parent_child", personAId: existingIndividualId, personBId: newIndividualId };
    case "spouse":
      return { familyTreeId: treeId, type: "spouse", personAId: newIndividualId, personBId: existingIndividualId };
    case "sibling":
      return { familyTreeId: treeId, type: "sibling", personAId: newIndividualId, personBId: existingIndividualId };
  }
}

function toDefaultValues(individual?: Individual): FormValues {
  return {
    fullName: individual?.fullName ?? "",
    alias: individual?.alias ?? "",
    gender: individual?.gender ?? "unknown",
    birthDatePrecision: individual?.birthDate?.precision ?? "unknown",
    birthDateValue: individual?.birthDate
      ? denormalizeDate(individual.birthDate.value, individual.birthDate.precision)
      : "",
    isDeceased: individual?.isDeceased ?? false,
    deathDatePrecision: individual?.deathDate?.precision ?? "unknown",
    deathDateValue: individual?.deathDate
      ? denormalizeDate(individual.deathDate.value, individual.deathDate.precision)
      : "",
    notes: individual?.notes ?? "",
    siblingOrder: individual?.siblingOrder?.toString() ?? "",
  };
}

function dateInputType(precision: DatePrecision): string {
  if (precision === "day") return "date";
  if (precision === "month") return "month";
  if (precision === "year") return "number";
  return "text";
}

export function IndividualForm({
  treeId,
  initialIndividual,
  existingIndividuals = [],
  onSuccess,
  onCancel,
}: IndividualFormProps) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkToId, setLinkToId] = useState("");
  const [linkRelationshipOption, setLinkRelationshipOption] = useState<LinkRelationshipOption>("parent_of_selected");
  // Set once the individual itself is saved, so a failed relationship-link retry
  // doesn't create a second individual — only the link step is retried.
  const [savedIndividual, setSavedIndividual] = useState<Individual | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(individualFormSchema),
    defaultValues: toDefaultValues(initialIndividual),
  });

  const birthPrecision = watch("birthDatePrecision");
  const deathPrecision = watch("deathDatePrecision");
  const isDeceased = watch("isDeceased");
  const siblingOrderInput = watch("siblingOrder");
  const genderInput = watch("gender");
  const siblingOrderPreview =
    siblingOrderInput && /^\d+$/.test(siblingOrderInput) && Number(siblingOrderInput) >= 2
      ? siblingOrderLabel(Number(siblingOrderInput), genderInput)
      : undefined;
  const { showToast } = useToast();

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setSubmitting(true);
    let saved = savedIndividual;
    try {
      if (!saved) {
        const input: IndividualInput = {
          fullName: values.fullName,
          alias: values.alias || undefined,
          gender: values.gender,
          birthDate:
            values.birthDatePrecision !== "unknown" && values.birthDateValue
              ? { value: normalizeDate(values.birthDateValue, values.birthDatePrecision), precision: values.birthDatePrecision }
              : undefined,
          isDeceased: values.isDeceased,
          deathDate:
            values.isDeceased && values.deathDatePrecision !== "unknown" && values.deathDateValue
              ? { value: normalizeDate(values.deathDateValue, values.deathDatePrecision), precision: values.deathDatePrecision }
              : undefined,
          notes: values.notes || undefined,
          siblingOrder: values.siblingOrder ? Number(values.siblingOrder) : undefined,
        };

        saved = initialIndividual
          ? await updateIndividual(initialIndividual.id, input)
          : await createIndividual(treeId, input);

        if (avatarFile) {
          await uploadAvatar(saved.id, avatarFile);
        }

        if (!initialIndividual) setSavedIndividual(saved);
      }

      if (!initialIndividual && linkToId) {
        await createRelationship(buildLinkRelationshipInput(treeId, saved.id, linkToId, linkRelationshipOption));
      }

      showToast(
        "success",
        initialIndividual ? `Đã cập nhật "${saved.fullName}".` : `Đã thêm "${saved.fullName}" vào cây gia phả.`,
      );
      onSuccess(saved);
    } catch (err) {
      const message = saved
        ? `Đã lưu cá thể, nhưng không thể liên kết mối quan hệ: ${err instanceof Error ? err.message : "Lỗi không xác định."}`
        : err instanceof Error
          ? err.message
          : "Không thể lưu thông tin cá nhân.";
      setSubmitError(message);
      showToast("error", message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkipLinking() {
    if (savedIndividual) onSuccess(savedIndividual);
    else onCancel();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {savedIndividual && (
        <p className="rounded-lg bg-[var(--color-brand-50)] p-2 text-sm text-[var(--color-brand-700)]">
          Đã lưu "{savedIndividual.fullName}". Chọn mối quan hệ bên dưới rồi nhấn Lưu lại.
        </p>
      )}
      <fieldset disabled={Boolean(savedIndividual)} className="contents">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="fullName">
          Họ tên *
        </label>
        <input
          id="fullName"
          {...register("fullName")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        {errors.fullName && <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.fullName.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="alias">
          Bí danh
        </label>
        <input id="alias" {...register("alias")} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="gender">
          Giới tính *
        </label>
        <select id="gender" {...register("gender")} className="w-full rounded-lg border border-gray-300 px-3 py-2">
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
          <option value="unknown">Không rõ</option>
        </select>
      </div>

      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-1 text-sm font-medium">Ngày sinh</legend>
        <select
          {...register("birthDatePrecision")}
          className="rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="unknown">Không rõ</option>
          <option value="year">Chỉ năm</option>
          <option value="month">Tháng/Năm</option>
          <option value="day">Ngày/Tháng/Năm</option>
        </select>
        <Controller
          control={control}
          name="birthDateValue"
          render={({ field }) => (
            <input
              {...field}
              type={dateInputType(birthPrecision)}
              disabled={birthPrecision === "unknown"}
              placeholder={birthPrecision === "year" ? "VD: 1954" : undefined}
              className="rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
            />
          )}
        />
      </fieldset>

      <div className="flex items-center gap-2">
        <input id="isDeceased" type="checkbox" {...register("isDeceased")} className="h-4 w-4" />
        <label htmlFor="isDeceased" className="text-sm font-medium">
          Đã mất
        </label>
      </div>

      {isDeceased && (
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-sm font-medium">Ngày mất</legend>
          <select
            {...register("deathDatePrecision")}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="unknown">Không rõ</option>
            <option value="year">Chỉ năm</option>
            <option value="month">Tháng/Năm</option>
            <option value="day">Ngày/Tháng/Năm</option>
          </select>
          <Controller
            control={control}
            name="deathDateValue"
            render={({ field }) => (
              <input
                {...field}
                type={dateInputType(deathPrecision)}
                disabled={deathPrecision === "unknown"}
                placeholder={deathPrecision === "year" ? "VD: 2020" : undefined}
                className="rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
              />
            )}
          />
        </fieldset>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="siblingOrder">
          Số thứ tự giữa anh/chị/em
        </label>
        <input
          id="siblingOrder"
          type="number"
          min={2}
          placeholder="VD: con cả là 2, thứ hai là 3, ..."
          {...register("siblingOrder")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          Theo cách gọi người Việt: con cả là 2, rồi 3, 4, 5... (không có thứ nhất). Để trống nếu không rõ hoặc là
          con một.
        </p>
        {siblingOrderPreview && (
          <p className="mt-1 text-sm font-medium text-[var(--color-brand-600)]">→ {siblingOrderPreview}</p>
        )}
        {errors.siblingOrder && (
          <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.siblingOrder.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="notes">
          Ghi chú (tối đa 100 ký tự)
        </label>
        <textarea
          id="notes"
          maxLength={100}
          {...register("notes")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          rows={2}
        />
        {errors.notes && <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.notes.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="avatar">
          Ảnh đại diện
        </label>
        <input
          id="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
      </div>
      </fieldset>

      {!initialIndividual && existingIndividuals.length > 0 && (
        <fieldset className="flex flex-col gap-2 rounded-lg border border-[var(--color-brand-100)] p-3">
          <legend className="mb-1 text-sm font-medium">Liên kết với (không bắt buộc)</legend>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Cá thể mới sẽ chưa hiển thị trên cây gia phả cho đến khi có mối quan hệ với ai đó. Chọn một người và mối
            quan hệ ở đây, hoặc thêm mối quan hệ sau từ trang chi tiết cá thể.
          </p>
          <select
            value={linkToId}
            onChange={(event) => setLinkToId(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">-- Không liên kết --</option>
            {existingIndividuals.map((person) => (
              <option key={person.id} value={person.id}>
                {person.fullName}
              </option>
            ))}
          </select>
          {linkToId && (
            <select
              value={linkRelationshipOption}
              onChange={(event) => setLinkRelationshipOption(event.target.value as LinkRelationshipOption)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              {Object.entries(linkRelationshipLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </fieldset>
      )}

      {submitError && <p className="text-sm text-[var(--color-danger)]">{submitError}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleSkipLinking}
          className="rounded-lg px-4 py-2 text-sm text-[var(--color-ink-muted)]"
        >
          {savedIndividual ? "Bỏ qua, đóng" : "Hủy"}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-60"
        >
          {submitting ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </form>
  );
}
