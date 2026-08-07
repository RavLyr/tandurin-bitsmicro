import Image from "next/image";

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
}

const INITIALS_REGEX = /[^\p{L}\p{N}]/gu;

/**
 * User avatar: image when src present, otherwise initials fallback.
 * ponytail: inline initials derivation (first two words); upgrade path =
 * store display_name initials in profile row if Airtable specifies one.
 */
export function Avatar({ src, name, size = 40, className }: AvatarProps) {
  const initials =
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.replace(INITIALS_REGEX, "")[0] ?? "")
      .join("")
      .toUpperCase() ?? "";

  const style = { width: size, height: size };

  if (src) {
    return (
      <Image
        src={src}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        className={`rounded-full object-cover ring-1 ring-outline ${className ?? ""}`}
        style={style}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`flex items-center justify-center rounded-full bg-primary font-button text-sm uppercase text-on-primary ${className ?? ""}`}
    >
      {initials || "?"}
    </span>
  );
}
