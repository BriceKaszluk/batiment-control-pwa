"use client";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";

import { getBuildingAreaLabel } from "@/features/buildings/services/building-area-labels";
import {
  getControlQualityRatingLabel,
  getControlStatusLabel,
} from "@/features/controls/services/control-labels";
import type { LocalControlDetail } from "@/features/controls/services/local-control-detail";
import type { ControlPhoto } from "@/types/domain";

type PdfFonts = {
  bold: PDFFont;
  regular: PDFFont;
};

type PdfLayout = {
  bottom: number;
  fonts: PdfFonts;
  page: PDFPage;
  pdfDoc: PDFDocument;
  top: number;
  y: number;
};

type TextOptions = {
  color?: RGB;
  font?: PDFFont;
  lineHeight?: number;
  size?: number;
  width?: number;
};

type EmbeddedPhoto = {
  bytes: Uint8Array;
  caption: string;
  height: number;
  width: number;
};

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 40;
const primary = rgb(0.08, 0.22, 0.18);
const border = rgb(0.82, 0.86, 0.84);
const ink = rgb(0.08, 0.1, 0.1);
const muted = rgb(0.39, 0.45, 0.43);
const success = rgb(0.06, 0.45, 0.24);
const danger = rgb(0.68, 0.12, 0.12);
const pageTop = pageHeight - margin;
const pageBottom = margin;
const contentWidth = pageWidth - margin * 2;
const maxPhotoWidth = 920;
const photoJpegQuality = 0.74;

export async function createControlPdfBlob(
  detail: LocalControlDetail,
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
  };
  const layout = createLayout(pdfDoc, fonts);

  drawReportHeader(layout, detail);
  drawSummary(layout, detail);
  drawAreaResults(layout, detail);
  drawObservation(layout, detail);
  await drawPhotos(layout, detail.photos);
  drawFooter(pdfDoc, fonts);

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfBuffer).set(pdfBytes);

  return new Blob([pdfBuffer], { type: "application/pdf" });
}

export function getControlPdfFileName(detail: LocalControlDetail) {
  const buildingName = detail.building?.name ?? "batiment";
  const completedAt = detail.control.completedAt ?? detail.control.startedAt;
  const datePart = new Intl.DateTimeFormat("fr-FR")
    .format(new Date(completedAt))
    .replaceAll("/", "-");

  return `controle-${sanitizeFileName(buildingName)}-${datePart}.pdf`;
}

export function sanitizeFileName(value: string) {
  const sanitized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLocaleLowerCase("fr");

  return sanitized || "controle";
}

function createLayout(pdfDoc: PDFDocument, fonts: PdfFonts): PdfLayout {
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  return {
    bottom: pageBottom,
    fonts,
    page,
    pdfDoc,
    top: pageTop,
    y: pageTop,
  };
}

function addPage(layout: PdfLayout) {
  layout.page = layout.pdfDoc.addPage([pageWidth, pageHeight]);
  layout.y = layout.top;
}

function ensureSpace(layout: PdfLayout, height: number) {
  if (layout.y - height < layout.bottom) {
    addPage(layout);
  }
}

function drawReportHeader(layout: PdfLayout, detail: LocalControlDetail) {
  const { page } = layout;
  const headerHeight = 92;

  page.drawRectangle({
    color: primary,
    height: headerHeight,
    width: pageWidth,
    x: 0,
    y: pageHeight - headerHeight,
  });
  drawText(layout, "Synthese de controle", margin, pageHeight - 40, {
    color: rgb(1, 1, 1),
    font: layout.fonts.bold,
    size: 22,
    width: contentWidth,
  });
  drawText(
    layout,
    detail.building?.name ?? "Batiment non disponible",
    margin,
    pageHeight - 64,
    {
      color: rgb(0.9, 0.96, 0.93),
      size: 12,
      width: contentWidth,
    },
  );
  drawText(layout, formatDateTime(detail.control.completedAt), margin, pageHeight - 82, {
    color: rgb(0.9, 0.96, 0.93),
    size: 10,
    width: contentWidth,
  });

  layout.y = pageHeight - headerHeight - 24;
}

function drawSummary(layout: PdfLayout, detail: LocalControlDetail) {
  const building = detail.building;
  const rows = [
    ["Batiment", building?.name ?? "Non renseigne"],
    ["Adresse", building?.address ?? "Non renseignee"],
    ["Secteur", building?.sector ?? "Non renseigne"],
    ["Agent", detail.agent?.name ?? building?.assignedAgentName ?? "Non affecte"],
    ["Statut", getControlStatusLabel(detail.control.status)],
    [
      "Etat global",
      detail.control.qualityRating
        ? getControlQualityRatingLabel(detail.control.qualityRating)
        : "Non renseigne",
    ],
  ];

  drawSectionTitle(layout, "Informations generales");
  drawCard(layout, 122, () => {
    let rowY = layout.y - 18;

    for (const [label, value] of rows) {
      drawText(layout, label, margin + 16, rowY, {
        color: muted,
        font: layout.fonts.bold,
        size: 9,
        width: 96,
      });
      const used = drawWrappedText(layout, value, margin + 118, rowY, {
        size: 9.5,
        width: contentWidth - 136,
      });
      rowY -= Math.max(17, used);
    }
  });
}

function drawAreaResults(layout: PdfLayout, detail: LocalControlDetail) {
  drawSectionTitle(layout, "Elements controles");

  if (detail.areaResults.length === 0) {
    drawEmptyState(layout, "Aucun element de batiment a controler.");
    return;
  }

  for (const entry of detail.areaResults) {
    const status = entry.result?.status ?? null;
    const statusLabel =
      status === "satisfying"
        ? "Satisfaisant"
        : status === "unsatisfying"
          ? "Insatisfaisant"
          : "Non renseigne";
    const statusColor =
      status === "satisfying" ? success : status === "unsatisfying" ? danger : muted;

    drawStatusRow(layout, getBuildingAreaLabel(entry.area), statusLabel, statusColor);
  }
}

function drawObservation(layout: PdfLayout, detail: LocalControlDetail) {
  drawSectionTitle(layout, "Observation generale");
  const comment = detail.control.generalComment?.trim();

  if (!comment) {
    drawEmptyState(layout, "Aucune observation renseignee.");
    return;
  }

  const height = estimateWrappedHeight(comment, contentWidth - 28, layout.fonts.regular, 10) + 28;
  drawCard(layout, Math.max(54, height), () => {
    drawWrappedText(layout, comment, margin + 14, layout.y - 18, {
      lineHeight: 14,
      size: 10,
      width: contentWidth - 28,
    });
  });
}

async function drawPhotos(layout: PdfLayout, photos: ControlPhoto[]) {
  drawSectionTitle(layout, "Photos");

  if (photos.length === 0) {
    drawEmptyState(layout, "Aucune photo ajoutee au controle.");
    return;
  }

  for (const photo of photos) {
    const embeddedPhoto = await preparePhoto(photo);
    const image = await layout.pdfDoc.embedJpg(embeddedPhoto.bytes);
    const maxWidth = contentWidth;
    const maxHeight = 320;
    const ratio = Math.min(
      maxWidth / embeddedPhoto.width,
      maxHeight / embeddedPhoto.height,
      1,
    );
    const imageWidth = embeddedPhoto.width * ratio;
    const imageHeight = embeddedPhoto.height * ratio;
    const blockHeight = imageHeight + 46;

    ensureSpace(layout, blockHeight);
    drawCard(layout, blockHeight, () => {
      drawText(layout, embeddedPhoto.caption, margin + 14, layout.y - 18, {
        font: layout.fonts.bold,
        size: 10,
        width: contentWidth - 28,
      });
      layout.page.drawImage(image, {
        height: imageHeight,
        width: imageWidth,
        x: margin + (contentWidth - imageWidth) / 2,
        y: layout.y - imageHeight - 34,
      });
    });
  }
}

function drawSectionTitle(layout: PdfLayout, title: string) {
  ensureSpace(layout, 34);
  drawText(layout, title, margin, layout.y, {
    color: primary,
    font: layout.fonts.bold,
    size: 13,
    width: contentWidth,
  });
  layout.y -= 18;
}

function drawCard(layout: PdfLayout, height: number, drawContent: () => void) {
  ensureSpace(layout, height + 10);
  const y = layout.y - height;

  layout.page.drawRectangle({
    borderColor: border,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
    height,
    width: contentWidth,
    x: margin,
    y,
  });
  drawContent();
  layout.y = y - 14;
}

function drawEmptyState(layout: PdfLayout, message: string) {
  drawCard(layout, 42, () => {
    drawText(layout, message, margin + 14, layout.y - 24, {
      color: muted,
      size: 10,
      width: contentWidth - 28,
    });
  });
}

function drawStatusRow(
  layout: PdfLayout,
  label: string,
  statusLabel: string,
  statusColor: RGB,
  options: { note?: string } = {},
) {
  const noteHeight = options.note
    ? estimateWrappedHeight(options.note, contentWidth - 28, layout.fonts.regular, 9)
    : 0;
  const height = Math.max(38, 34 + noteHeight);

  drawCard(layout, height, () => {
    drawText(layout, label, margin + 14, layout.y - 18, {
      font: layout.fonts.bold,
      size: 10,
      width: contentWidth - 150,
    });
    drawText(layout, statusLabel, margin + contentWidth - 128, layout.y - 18, {
      color: statusColor,
      font: layout.fonts.bold,
      size: 9,
      width: 114,
    });

    if (options.note) {
      drawWrappedText(layout, options.note, margin + 14, layout.y - 35, {
        color: muted,
        lineHeight: 12,
        size: 9,
        width: contentWidth - 28,
      });
    }
  });
}

function drawFooter(pdfDoc: PDFDocument, fonts: PdfFonts) {
  const pages = pdfDoc.getPages();

  pages.forEach((page, index) => {
    page.drawLine({
      color: border,
      end: { x: pageWidth - margin, y: 30 },
      start: { x: margin, y: 30 },
      thickness: 0.7,
    });
    page.drawText(`Page ${index + 1}/${pages.length}`, {
      color: muted,
      font: fonts.regular,
      size: 8,
      x: pageWidth - margin - 58,
      y: 16,
    });
    page.drawText("Batiment Control", {
      color: muted,
      font: fonts.bold,
      size: 8,
      x: margin,
      y: 16,
    });
  });
}

function drawWrappedText(
  layout: PdfLayout,
  text: string,
  x: number,
  y: number,
  options: TextOptions = {},
) {
  const font = options.font ?? layout.fonts.regular;
  const size = options.size ?? 10;
  const lineHeight = options.lineHeight ?? size + 4;
  const width = options.width ?? contentWidth;
  const lines = wrapText(text, width, font, size);

  lines.forEach((line, index) => {
    drawText(layout, line, x, y - index * lineHeight, options);
  });

  return lines.length * lineHeight;
}

function drawText(
  layout: PdfLayout,
  text: string,
  x: number,
  y: number,
  options: TextOptions = {},
) {
  layout.page.drawText(toPdfText(text), {
    color: options.color ?? ink,
    font: options.font ?? layout.fonts.regular,
    size: options.size ?? 10,
    x,
    y,
  });
}

function estimateWrappedHeight(
  text: string,
  width: number,
  font: PDFFont,
  size: number,
) {
  return wrapText(text, width, font, size).length * (size + 4);
}

function wrapText(text: string, width: number, font: PDFFont, size: number) {
  const words = toPdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, size) <= width) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

async function preparePhoto(photo: ControlPhoto): Promise<EmbeddedPhoto> {
  const image = await loadImage(photo.blob);
  const ratio = Math.min(maxPhotoWidth / image.naturalWidth, 1);
  const canvas = document.createElement("canvas");
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Preparation photo impossible.");
  }

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return {
    bytes: dataUrlToBytes(canvas.toDataURL("image/jpeg", photoJpegQuality)),
    caption: photo.caption?.trim() || photo.fileName,
    height,
    width,
  };
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Photo illisible."));
    };
    image.src = objectUrl;
  });
}

function dataUrlToBytes(dataUrl: string) {
  const [, base64Data] = dataUrl.split(",");

  if (!base64Data) {
    throw new Error("Image PDF invalide.");
  }

  const binary = window.atob(base64Data);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Date non renseignee";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function toPdfText(value: string) {
  return value
    .normalize("NFC")
    .replace(/\u0153/g, "oe")
    .replace(/\u0152/g, "OE")
    .replace(/[\u2018\u2019\u0060]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/[^\x20-\x7E\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/g, "?");
}
