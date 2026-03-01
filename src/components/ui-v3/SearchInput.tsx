import { SearchIcon } from "lucide-react";

type SearchInputProps = {
  name?: string;
  defaultValue?: string;
  placeholder: string;
  testId?: string;
};

export function SearchInput({
  name = "q",
  defaultValue,
  placeholder,
  testId,
}: SearchInputProps) {
  return (
    <div className="relative">
      <SearchIcon
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
        aria-hidden="true"
      />
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        data-testid={testId}
        className="vh-v3-focus w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 pl-10 text-sm text-stone-900 placeholder:text-stone-400 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
      />
    </div>
  );
}
