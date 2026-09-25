import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getCertificate } from "@/lib/certificates";

const INDIGO = rgb(0.31, 0.27, 0.9);
const SLATE = rgb(0.39, 0.45, 0.55);
const DARK = rgb(0.06, 0.09, 0.16);

/** Generates the certificate as a PDF (A4 landscape) on the fly — no storage needed. */
export async function GET(request: Request, ctx: RouteContext<"/api/certificates/[code]">) {
  const cert = await getCertificate((await ctx.params).code);
  if (!cert) return new Response("Certificate not found", { status: 404 });

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${cert.courseTitle} — Certificate`);
  pdf.setAuthor("EduMind");
  const page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();
  const [serif, serifBold, sans, sansBold] = await Promise.all([
    pdf.embedFont(StandardFonts.TimesRoman),
    pdf.embedFont(StandardFonts.TimesRomanBold),
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
  ]);

  // Standard PDF fonts only support WinAnsi; replace anything else so names with rare characters don't crash.
  const safe = (text: string) => text.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
  const centered = (text: string, y: number, size: number, font = sans, color = DARK, maxWidth = width - 160) => {
    let s = size;
    const t = safe(text);
    while (font.widthOfTextAtSize(t, s) > maxWidth && s > 10) s -= 1;
    page.drawText(t, { x: (width - font.widthOfTextAtSize(t, s)) / 2, y, size: s, font, color });
  };

  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: INDIGO, borderWidth: 3 });
  page.drawRectangle({ x: 30, y: 30, width: width - 60, height: height - 60, borderColor: INDIGO, borderWidth: 0.75 });

  centered("EduMind", height - 90, 26, sansBold, INDIGO);
  centered("CERTIFICATE OF COMPLETION", height - 130, 13, sans, SLATE);
  centered("This certifies that", height - 190, 14, serif, SLATE);
  centered(cert.studentName, height - 240, 40, serifBold, DARK);
  centered("has successfully completed the course", height - 285, 14, serif, SLATE);
  centered(cert.courseTitle, height - 325, 24, sansBold, INDIGO);

  const date = cert.completedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const footerY = 130;
  for (const [x, value, label] of [
    [width / 2 - 250, date, "Date"],
    [width / 2 + 250, cert.instructorName, "Instructor"],
  ] as const) {
    const v = safe(value);
    page.drawText(v, { x: x - sansBold.widthOfTextAtSize(v, 13) / 2, y: footerY, size: 13, font: sansBold, color: DARK });
    page.drawLine({ start: { x: x - 90, y: footerY - 8 }, end: { x: x + 90, y: footerY - 8 }, thickness: 0.75, color: SLATE });
    page.drawText(label, { x: x - sans.widthOfTextAtSize(label, 10) / 2, y: footerY - 24, size: 10, font: sans, color: SLATE });
  }
  page.drawCircle({ x: width / 2, y: footerY, size: 30, borderColor: INDIGO, borderWidth: 2 });
  centered("VERIFIED", footerY - 4, 9, sansBold, INDIGO);

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  centered(`Certificate ID ${cert.code} · Verify at ${origin}/certificates/${cert.code}`, 50, 9, sans, SLATE);

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="EduMind-certificate-${cert.code}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
