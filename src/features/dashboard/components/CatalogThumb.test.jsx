import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CatalogThumb } from "./CatalogThumb.jsx";

describe("CatalogThumb", () => {
  it("shows the picture with its own description when there is one", () => {
    const html = renderToStaticMarkup(<CatalogThumb name="Daniel Carter" image={{ url: "https://res.cloudinary.com/demo/image/upload/a.webp", alt: "Professional portrait of Daniel Carter, barber at The Cut Barbershop." }} />);
    expect(html).toContain("<img");
    expect(html).toContain("Professional portrait of Daniel Carter, barber at The Cut Barbershop.");
  });
  it("shows the first letter and says there is no picture when the record has none", () => {
    for (const image of [null, undefined, {}]) {
      const html = renderToStaticMarkup(<CatalogThumb name="Daniel Carter" image={image} />);
      expect(html).not.toContain("<img");
      expect(html).toContain(">D<");
      expect(html).toContain("Daniel Carter: no picture yet");
    }
  });
});
