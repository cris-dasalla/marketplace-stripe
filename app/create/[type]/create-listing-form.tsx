"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, categoryName } from "@/lib/categories";
import {
  LIMITS,
  formatPrice,
  parsePrice,
  validateImage,
  validateListing,
  type FieldErrors,
} from "@/lib/listings";
import { MAX_INPUT_BYTES, preparePhoto } from "@/lib/image";
import { createListing } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Props {
  heading: string;
  defaultCategory: string;
}

export function CreateListingForm({ heading, defaultCategory }: Props) {
  const router = useRouter();
  const [fields, setFields] = useState({
    title: "",
    price: "",
    category: defaultCategory,
    location: "",
    seller_email: "",
    description: "",
  });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = (name: keyof typeof fields) => (value: string) => {
    setFields((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  async function pickImage(file: File | undefined) {
    if (!file) return;
    const reject = (message: string) => {
      setErrors((e) => ({ ...e, image: message }));
      if (fileInput.current) fileInput.current.value = "";
    };
    if (!file.type.startsWith("image/")) return reject("Choose a photo (JPG, PNG, WebP or GIF).");
    if (file.size > MAX_INPUT_BYTES) return reject("That photo is too large (over 25 MB).");

    setProcessing(true);
    try {
      // Strips location metadata and shrinks big phone photos before upload.
      const prepared = await preparePhoto(file);
      const problem = validateImage(prepared);
      if (problem) return reject(problem);
      if (preview) URL.revokeObjectURL(preview);
      setImage(prepared);
      setPreview(URL.createObjectURL(prepared));
      setErrors((e) => ({ ...e, image: undefined }));
    } catch {
      reject("Couldn't read that photo. Try a JPG or PNG.");
    } finally {
      setProcessing(false);
    }
  }

  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateListing({ ...fields, hasImage: image !== null });
    setErrors(found);
    if (Object.keys(found).length > 0 || !image) {
      const firstField = Object.keys(found)[0];
      document.getElementById(`field-${firstField}`)?.focus();
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      const id = await createListing(fields, image);
      router.push(`/listing/${id}`);
    } catch (error) {
      const e = error as { code?: string; message?: string };
      setSubmitError(e.code === "P0001" && e.message ? e.message : "Couldn't publish your listing. Please try again.");
      setSaving(false);
    }
  }

  const price = parsePrice(fields.price);

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.1)]"
        aria-labelledby="create-heading"
      >
        <h1 id="create-heading" className="text-[22px] font-bold">
          {heading}
        </h1>

        {/* Photo */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium" id="photo-label">
            Photo <span aria-hidden className="text-destructive">*</span>
          </span>
          {preview ? (
            <div className="relative overflow-hidden rounded-lg border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={preview} alt="Selected photo" className="aspect-[4/3] w-full object-cover" />
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                onClick={clearImage}
                aria-label="Remove photo"
                className="absolute top-2 right-2 rounded-full shadow"
              >
                <X aria-hidden />
              </Button>
            </div>
          ) : (
            <label
              htmlFor="field-image"
              className={cn(
                "flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/50 text-muted-foreground hover:bg-muted focus-within:outline-2 focus-within:outline-ring",
                errors.image && "border-destructive",
              )}
            >
              <span className="grid size-10 place-items-center rounded-full bg-white">
                <ImagePlus className="size-5" aria-hidden />
              </span>
              <span className="font-semibold text-foreground">{processing ? "Preparing photo..." : "Add photo"}</span>
              <span className="text-xs">JPG, PNG, WebP or GIF · location data is removed</span>
            </label>
          )}
          <input
            ref={fileInput}
            id="field-image"
            type="file"
            accept="image/*"
            className="sr-only"
            aria-labelledby="photo-label"
            aria-invalid={!!errors.image || undefined}
            onChange={(e) => pickImage(e.target.files?.[0])}
          />
          <FieldError message={errors.image} />
        </div>

        <Field label="Title" name="title" error={errors.title} required>
          <Input
            id="field-title"
            value={fields.title}
            onChange={(e) => set("title")(e.target.value)}
            maxLength={LIMITS.title}
            placeholder="What are you selling?"
            aria-invalid={!!errors.title || undefined}
          />
        </Field>

        <Field label="Price" name="price" error={errors.price} required>
          <Input
            id="field-price"
            value={fields.price}
            onChange={(e) => set("price")(e.target.value)}
            inputMode="decimal"
            placeholder="0 for free"
            aria-invalid={!!errors.price || undefined}
          />
        </Field>

        <Field label="Category" name="category" error={errors.category} required>
          <select
            id="field-category"
            value={fields.category}
            onChange={(e) => set("category")(e.target.value)}
            aria-invalid={!!errors.category || undefined}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
          >
            <option value="" disabled>
              Select a category
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Location" name="location" error={errors.location}>
          <Input
            id="field-location"
            value={fields.location}
            onChange={(e) => set("location")(e.target.value)}
            maxLength={LIMITS.location}
            placeholder="e.g. Makati, Metro Manila"
            autoComplete="address-level2"
          />
        </Field>

        <Field label="Contact email" name="seller_email" error={errors.seller_email} required>
          <Input
            id="field-seller_email"
            type="email"
            value={fields.seller_email}
            onChange={(e) => set("seller_email")(e.target.value)}
            maxLength={LIMITS.email}
            placeholder="seller@example.com"
            autoComplete="email"
            aria-invalid={!!errors.seller_email || undefined}
          />
        </Field>

        <Field label="Description" name="description" error={errors.description}>
          <Textarea
            id="field-description"
            value={fields.description}
            onChange={(e) => set("description")(e.target.value)}
            maxLength={LIMITS.description}
            placeholder="Condition, size, pickup details..."
            className="min-h-28"
          />
        </Field>

        {submitError && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {submitError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={saving || processing} className="h-10 font-semibold">
          {saving ? "Publishing..." : "Publish listing"}
        </Button>
      </form>

      {/* Live preview */}
      <section aria-label="Preview" className="hidden rounded-xl bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.1)] lg:block">
        <h2 className="mb-3 text-[17px] font-bold">Preview</h2>
        <div className="grid overflow-hidden rounded-lg border lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex aspect-square items-center justify-center bg-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview
              <img src={preview} alt="" className="size-full object-contain" />
            ) : (
              <p className="max-w-56 text-center text-muted-foreground">Your listing preview will appear here as you add details.</p>
            )}
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div>
              <p className="text-[20px] leading-tight font-bold break-words">{fields.title || "Title"}</p>
              <p className="mt-1 text-[17px] font-semibold">{price === null ? "Price" : formatPrice(price)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Listed just now{fields.location && ` in ${fields.location}`}
              </p>
            </div>
            {fields.category && <p className="text-sm">{categoryName(fields.category)}</p>}
            <div>
              <p className="font-bold">Description</p>
              <p className="text-sm whitespace-pre-wrap break-words text-muted-foreground">
                {fields.description || "Description will appear here."}
              </p>
            </div>
            <div>
              <p className="font-bold">Seller information</p>
              <p className="text-sm break-all text-muted-foreground">{fields.seller_email || "seller@example.com"}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  error,
  required,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`field-${name}`}>
        {label}
        {required && <span aria-hidden className="text-destructive">*</span>}
      </Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
