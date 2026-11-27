interface LiveRegionProps {
  politeMessage: string;
  assertiveMessage: string;
}

export function LiveRegion({ politeMessage, assertiveMessage }: LiveRegionProps) {
  return (
    <>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {politeMessage}
      </div>
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true">
        {assertiveMessage}
      </div>
    </>
  );
}
