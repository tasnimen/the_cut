import Link from "next/link";

export function BrandMark() {
  return (
    <Link className="brand" href="/" aria-label="The Cut Barbershop home">
      <svg className="brand-symbol" viewBox="0 0 38 44" aria-hidden="true">
        <path d="M19 2 35 11v22L19 42 3 33V11L19 2Z" />
        <path d="m19 9 9 5v14l-9 7-9-7V14l9-5Z" />
        <path d="m15 20 8-6-3 10 5-3-8 9 2-8-4 2Z" />
      </svg>
      <span className="brand-name">THE CUT<small>BARBERSHOP</small></span>
    </Link>
  );
}
