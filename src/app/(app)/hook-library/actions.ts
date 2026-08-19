"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand, type Brand } from "@/lib/brand";
import { HOOK_LIBRARY_TYPES, type HookLibraryType } from "@/lib/types";

// One type per import, chosen in the UI before choosing a file, not read
// from the file. A file is just a flat list of content strings: one
// value per CSV row (an optional leading "content" header is dropped;
// quoted values have their wrapping quotes and escaped "" unescaped), or
// a JSON array of strings (or of objects carrying a "content" field).
function parseContentLines(text: string): string[] {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const startIdx = lines[0].trim().replace(/^"|"$/g, "").toLowerCase() === "content" ? 1 : 0;
  return lines.slice(startIdx).map((line) => {
    let v = line.trim();
    if (v.startsWith('"') && v.endsWith('"')) {
      v = v.slice(1, -1).replace(/""/g, '"');
    }
    return v;
  });
}

function isHookLibraryType(value: string): value is HookLibraryType {
  return (HOOK_LIBRARY_TYPES as readonly string[]).includes(value);
}

export type ImportState = { error: string | null; imported: number | null; skipped: number };

// Everything in the file is imported as the one type chosen in the UI,
// no per-row type field, no auto-routing, no AI classification involved.
export async function importHookLibrary(
  _prevState: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const type = String(formData.get("type") ?? "").trim().toLowerCase();
  if (!isHookLibraryType(type)) {
    return { error: "Choose a hook type first.", imported: null, skipped: 0 };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV or JSON file first.", imported: null, skipped: 0 };
  }

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand: Brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const text = await file.text();
  let contents: string[];
  try {
    if (file.name.toLowerCase().endsWith(".json")) {
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        return { error: "JSON file must be an array of entries.", imported: null, skipped: 0 };
      }
      contents = parsed.map((el) =>
        typeof el === "string" ? el.trim() : String((el as { content?: unknown })?.content ?? "").trim(),
      );
    } else {
      contents = parseContentLines(text);
    }
  } catch {
    return { error: "Couldn't parse that file, check it's valid CSV or JSON.", imported: null, skipped: 0 };
  }

  const valid = contents.filter((c) => c.length > 0);
  const skipped = contents.length - valid.length;

  if (valid.length === 0) {
    return { error: "No non-empty entries found in that file.", imported: null, skipped };
  }

  const rows = valid.map((content) => ({ brand, type, content }));

  const supabase = await createClient();
  const { error } = await supabase.from("hook_library_entries").insert(rows);
  if (error) {
    return { error: error.message, imported: null, skipped };
  }

  revalidatePath("/hook-library");
  return { error: null, imported: valid.length, skipped };
}

export async function updateHookLibraryEntry(id: string, formData: FormData) {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("hook_library_entries")
    .update({ content })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/hook-library");
}

export async function deleteHookLibraryEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("hook_library_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/hook-library");
}
