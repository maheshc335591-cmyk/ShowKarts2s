export default function BrandLogo() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5">
      <img
        src="/showkart-mark.svg"
        alt=""
        width={48}
        height={48}
        className="size-11 shrink-0 sm:size-12"
      />
      <span className="flex flex-col gap-1 whitespace-nowrap">
        <span className="font-heading text-[20px] font-extrabold leading-none tracking-[-0.04em] sm:text-[23px]">
          <span className="text-[#FAF7EC]">Show</span>
          <span className="text-[#D8B45A]">Kart</span>
        </span>
        <span className="text-[8px] font-semibold uppercase leading-none tracking-[0.2em] text-[#D8BD73] sm:text-[9px]">
          From Stage to Seat
        </span>
      </span>
    </span>
  );
}
