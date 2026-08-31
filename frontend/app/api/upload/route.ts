import { NextResponse } from "next/server";
import { z } from "zod";
import { pinata } from "@/lib/pinata";
import { BEAST_IPFS_CIDS } from "@/lib/ipfs-cids";

const BEAST_NAMES = Object.keys(BEAST_IPFS_CIDS) as [string, ...string[]];

const UploadSchema = z.object({
  name: z.string().min(1, "Name is required").max(60, "Name too long"),
  description: z.string().min(1, "Description is required").max(500, "Description too long"),
  element: z.enum(["Fire", "Water", "Earth", "Air", "Lightning", "Shadow"]),
  rarity: z.enum(["Common", "Rare", "Epic", "Legendary"]),
  attack: z.coerce.number().min(1).max(100),
  defense: z.coerce.number().min(1).max(100),
  speed: z.coerce.number().min(1).max(100),
  // Present only when the user picked a built-in preset instead of uploading
  // a custom image. Must be one of BEAST_IPFS_CIDS's keys — never an
  // arbitrary client-supplied URL.
  builtinBeast: z.enum(BEAST_NAMES).optional(),
});

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    const parsed = UploadSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
      element: formData.get("element"),
      rarity: formData.get("rarity"),
      attack: formData.get("attack"),
      defense: formData.get("defense"),
      speed: formData.get("speed"),
      builtinBeast: formData.get("builtinBeast") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const hasCustomFile = !!file && file.size > 0;
    const hasBuiltinBeast = !!parsed.data.builtinBeast;

    if (!hasCustomFile && !hasBuiltinBeast) {
      return NextResponse.json(
        { error: "Provide either an image file or a valid builtinBeast." },
        { status: 400 }
      );
    }

    let imageUri: string;

    if (hasCustomFile) {
      if (!ALLOWED_MIME_TYPES.includes(file!.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Only JPEG, PNG, WEBP, GIF, and SVG images are allowed." },
          { status: 400 }
        );
      }
      if (file!.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "File size exceeds maximum limit of 10MB." },
          { status: 400 }
        );
      }

      try {
        const upload = await pinata.upload.public.file(file!);
        imageUri = `ipfs://${upload.cid}`;
      } catch (err) {
        console.error("Pinata image upload failed:", err);
        return NextResponse.json(
          { error: "Failed to upload image to IPFS." },
          { status: 502 }
        );
      }
    } else {
      // Built-in artwork — already pinned by scripts/pin-builtin-artworks.mjs.
      // No network call needed, no arbitrary URL accepted.
      const cid = BEAST_IPFS_CIDS[parsed.data.builtinBeast!];
      imageUri = `ipfs://${cid}`;
    }

    const metadata = {
      name: parsed.data.name,
      description: parsed.data.description,
      image: imageUri,
      external_url: "https://elemental-beasts.vercel.app",
      attributes: [
        { trait_type: "Element", value: parsed.data.element },
        { trait_type: "Rarity", value: parsed.data.rarity },
        { trait_type: "Attack", value: parsed.data.attack },
        { trait_type: "Defense", value: parsed.data.defense },
        { trait_type: "Speed", value: parsed.data.speed },
      ],
    };

    let metadataCid: string;
    try {
      const metadataUpload = await pinata.upload.public.json(metadata);
      metadataCid = metadataUpload.cid;
    } catch (err) {
      console.error("Pinata metadata upload failed:", err);
      return NextResponse.json(
        { error: "Failed to upload NFT metadata to IPFS." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      metadataCid,
      tokenUri: `ipfs://${metadataCid}`,
      imageUri,
      metadata,
    });
  } catch (err: any) {
    console.error("Upload route error:", err);
    return NextResponse.json(
      { error: "Internal server error during upload." },
      { status: 500 }
    );
  }
}