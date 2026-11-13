import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { cn, TagChip } from "@inbox/ui";
import { useApi } from "../state/api";

/** M4: tag editor combobox with autocomplete from existing tags; Enter creates a new tag. */
export function TagCombobox({
  onAdd,
  placeholder,
  exclude = [],
}: {
  onAdd: (tagName: string) => void;
  placeholder: string;
  exclude?: string[];
}) {
  const { t } = useTranslation();
  const api = useApi();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const { data: tags } = useQuery({ queryKey: ["tags"], queryFn: () => api.listTags() });

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    return (tags ?? [])
      .filter((tag) => !exclude.includes(tag.name))
      .filter((tag) => (q ? tag.name.toLowerCase().includes(q) : true))
      .slice(0, 6);
  }, [tags, value, exclude]);

  useEffect(() => setActiveIndex(0), [value]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const commit = (name: string) => {
    const trimmed = name.trim();
    if (trimmed) onAdd(trimmed);
    setValue("");
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative min-w-[140px] flex-1">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls="tag-combobox-list"
        aria-autocomplete="list"
        aria-label={t("item.addTag")}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (open && suggestions[activeIndex] && value.trim()) commit(suggestions[activeIndex].name);
            else commit(value);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-7 w-full rounded-control border border-dashed border-border-strong bg-transparent px-2 text-xs text-text outline-none placeholder:text-text-tertiary focus-visible:outline-2 focus-visible:outline-accent"
      />
      {open && suggestions.length > 0 && (
        <ul
          id="tag-combobox-list"
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 w-full min-w-[160px] overflow-hidden rounded-dialog border border-border bg-surface p-1 shadow-pop"
        >
          {suggestions.map((tag, i) => (
            <li key={tag.id} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(tag.name)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-sm",
                  i === activeIndex ? "bg-accent-subtle text-accent" : "text-text hover:bg-surface-subtle",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                <span className="shrink-0 text-xs text-text-tertiary">
                  {tag.origin === "user" ? t("tags.originUser") : t("tags.originAi")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Read-only chip list of confirmed + suggested tags with one-click accept/remove. */
export function TagChipsRow({
  userTags,
  suggestedTags,
  onAccept,
  onRemoveUser,
  onRemoveSuggested,
}: {
  userTags: string[];
  suggestedTags: string[];
  onAccept: (tag: string) => void;
  onRemoveUser: (tag: string) => void;
  onRemoveSuggested: (tag: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {userTags.map((tag) => (
        <TagChip
          key={`u-${tag}`}
          label={tag}
          onRemove={() => onRemoveUser(tag)}
          removeLabel={t("item.removeTag")}
        />
      ))}
      {suggestedTags
        .filter((s) => !userTags.includes(s))
        .map((tag) => (
          <TagChip
            key={`s-${tag}`}
            label={tag}
            suggested
            onAccept={() => onAccept(tag)}
            onRemove={() => onRemoveSuggested(tag)}
            acceptLabel={t("item.acceptTag")}
            removeLabel={t("item.removeTag")}
          />
        ))}
    </>
  );
}
