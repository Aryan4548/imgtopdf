const state = {
  images: [],
};

const elements = {
  imageInput: document.querySelector("#imageInput"),
  dropZone: document.querySelector("#dropZone"),
  imageList: document.querySelector("#imageList"),
  imageCount: document.querySelector("#imageCount"),
  generatePdf: document.querySelector("#generatePdf"),
  clearImages: document.querySelector("#clearImages"),
  pageSize: document.querySelector("#pageSize"),
  orientation: document.querySelector("#orientation"),
  layout: document.querySelector("#layout"),
  imageFit: document.querySelector("#imageFit"),
  pdfName: document.querySelector("#pdfName"),
  margin: document.querySelector("#margin"),
  marginValue: document.querySelector("#marginValue"),
  gap: document.querySelector("#gap"),
  gapValue: document.querySelector("#gapValue"),
  watermarkEnabled: document.querySelector("#watermarkEnabled"),
  watermarkText: document.querySelector("#watermarkText"),
  watermarkPlacement: document.querySelector("#watermarkPlacement"),
  watermarkLayer: document.querySelector("#watermarkLayer"),
  watermarkOpacity: document.querySelector("#watermarkOpacity"),
  opacityValue: document.querySelector("#opacityValue"),
  watermarkSize: document.querySelector("#watermarkSize"),
  fontSizeValue: document.querySelector("#fontSizeValue"),
  previewMeta: document.querySelector("#previewMeta"),
  previewPages: document.querySelector("#previewPages"),
  emptyState: document.querySelector("#emptyState"),
  toast: document.querySelector("#toast"),
};

const pageRatios = {
  a4: 210 / 297,
  letter: 216 / 279,
  legal: 216 / 356,
  square: 1,
};

const layoutMap = {
  1: { columns: 1, rows: 1 },
  2: { columns: 1, rows: 2 },
  4: { columns: 2, rows: 2 },
  9: { columns: 3, rows: 3 },
};

let toastTimer;

function createId() {
  return globalThis.crypto?.randomUUID?.() || `image-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 2800);
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error(`${file.name} is not an image.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        resolve({
          id: createId(),
          name: file.name,
          size: file.size,
          src: reader.result,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => reject(new Error(`Could not load ${file.name}.`));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function addFiles(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;

  const accepted = files.filter((file) => file.type.startsWith("image/"));
  if (!accepted.length) {
    showToast("Choose one or more image files.");
    return;
  }

  elements.generatePdf.disabled = true;
  try {
    const loaded = await Promise.all(accepted.map(readImage));
    state.images.push(...loaded);
    render();
    showToast(`${loaded.length} image${loaded.length === 1 ? "" : "s"} added.`);
  } catch (error) {
    showToast(error.message || "One of the images could not be loaded.");
    render();
  }
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function moveImage(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= state.images.length) return;

  const [image] = state.images.splice(index, 1);
  state.images.splice(nextIndex, 0, image);
  render();
}

function removeImage(index) {
  state.images.splice(index, 1);
  render();
}

function getSettings() {
  return {
    pageSize: elements.pageSize.value,
    orientation: elements.orientation.value,
    imagesPerPage: Number(elements.layout.value),
    imageFit: elements.imageFit.value,
    pdfName: elements.pdfName.value.trim(),
    margin: Number(elements.margin.value),
    gap: Number(elements.gap.value),
    watermarkEnabled: elements.watermarkEnabled.checked,
    watermarkText: elements.watermarkText.value.trim(),
    watermarkPlacement: elements.watermarkPlacement.value,
    watermarkLayer: elements.watermarkLayer.value,
    watermarkOpacity: Number(elements.watermarkOpacity.value) / 100,
    watermarkSize: Number(elements.watermarkSize.value),
  };
}

function getPdfFileName(name) {
  const cleaned = name
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 80);

  return `${cleaned || "image-pdf"}.pdf`;
}

function getPageRatio(settings) {
  const baseRatio = pageRatios[settings.pageSize] || pageRatios.a4;
  return settings.orientation === "landscape" ? 1 / baseRatio : baseRatio;
}

function chunkImages(images, size) {
  const pages = [];
  for (let index = 0; index < images.length; index += size) {
    pages.push(images.slice(index, index + size));
  }
  return pages;
}

function renderImageList() {
  elements.imageList.innerHTML = "";

  state.images.forEach((image, index) => {
    const item = document.createElement("li");
    item.className = "image-item";

    const thumb = document.createElement("img");
    thumb.src = image.src;
    thumb.alt = "";

    const details = document.createElement("div");
    const name = document.createElement("span");
    name.className = "image-name";
    name.textContent = image.name;

    const size = document.createElement("span");
    size.className = "image-size";
    size.textContent = `${image.width} x ${image.height} - ${formatBytes(image.size)}`;

    details.append(name, size);

    const actions = document.createElement("div");
    actions.className = "image-actions";

    const upButton = createIconButton("arrow-up", "Move up", () => moveImage(index, -1));
    upButton.disabled = index === 0;

    const downButton = createIconButton("arrow-down", "Move down", () => moveImage(index, 1));
    downButton.disabled = index === state.images.length - 1;

    const removeButton = createIconButton("x", "Remove image", () => removeImage(index));
    actions.append(upButton, downButton, removeButton);

    item.append(thumb, details, actions);
    elements.imageList.append(item);
  });
}

function createIconButton(icon, title, onClick) {
  const button = document.createElement("button");
  button.className = "icon-button";
  button.type = "button";
  button.title = title;
  button.setAttribute("aria-label", title);
  button.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>`;
  button.addEventListener("click", onClick);
  return button;
}

function renderPreview() {
  const settings = getSettings();
  const pages = chunkImages(state.images, settings.imagesPerPage);
  const layout = layoutMap[settings.imagesPerPage];
  const pageCount = Math.max(1, pages.length);

  elements.previewPages.innerHTML = "";
  elements.emptyState.hidden = state.images.length > 0;
  elements.previewMeta.textContent = state.images.length
    ? `${state.images.length} image${state.images.length === 1 ? "" : "s"} on ${pageCount} page${pageCount === 1 ? "" : "s"}`
    : "Add images to start";

  if (!state.images.length) return;

  pages.forEach((pageImages, pageIndex) => {
    const hasWatermark = settings.watermarkEnabled && settings.watermarkText;
    const page = document.createElement("article");
    page.className = "preview-page";
    if (hasWatermark) {
      page.classList.add(`watermark-${settings.watermarkLayer}`);
    }
    page.style.setProperty("--page-ratio", getPageRatio(settings));
    page.setAttribute("aria-label", `Page ${pageIndex + 1}`);

    const grid = document.createElement("div");
    grid.className = "preview-page-grid";
    grid.style.gridTemplateColumns = `repeat(${layout.columns}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${layout.rows}, minmax(0, 1fr))`;
    grid.style.setProperty("--preview-gap", `${Math.max(settings.gap * 0.75, 2)}px`);

    for (let index = 0; index < settings.imagesPerPage; index += 1) {
      const image = pageImages[index];
      const slot = document.createElement("div");
      slot.className = `preview-slot ${settings.imageFit}`;

      if (image) {
        const img = document.createElement("img");
        img.src = image.src;
        img.alt = image.name;
        slot.append(img);
      }

      grid.append(slot);
    }

    const watermark = createWatermarkLayer(settings);
    if (watermark && settings.watermarkLayer === "behind") {
      page.append(watermark, grid);
    } else {
      page.append(grid);
      if (watermark) {
        page.append(watermark);
      }
    }

    elements.previewPages.append(page);
  });
}

function isPatternWatermark(settings) {
  return settings.watermarkPlacement.startsWith("pattern");
}

function getWatermarkAngle(settings) {
  if (settings.watermarkPlacement === "pattern-straight" || settings.watermarkPlacement === "center") {
    return 0;
  }

  if (settings.watermarkPlacement === "top" || settings.watermarkPlacement === "footer") {
    return 0;
  }

  return -32;
}

function createWatermarkLayer(settings) {
  if (!settings.watermarkEnabled || !settings.watermarkText) return null;

  const isPattern = isPatternWatermark(settings);
  const layer = document.createElement("div");
  layer.className = `preview-watermark-layer ${isPattern ? "pattern" : "single"} ${settings.watermarkPlacement}`;
  layer.style.setProperty("--watermark-opacity", settings.watermarkOpacity);
  layer.style.setProperty("--watermark-rotate", `${getWatermarkAngle(settings)}deg`);
  layer.style.setProperty(
    "--watermark-size",
    isPattern
      ? `clamp(10px, ${settings.watermarkSize / 8}vw, ${settings.watermarkSize * 0.78}px)`
      : `clamp(16px, ${settings.watermarkSize / 5}vw, ${settings.watermarkSize * 1.6}px)`,
  );

  const markCount = isPattern ? 12 : 1;
  for (let index = 0; index < markCount; index += 1) {
    const mark = document.createElement("span");
    mark.className = "preview-watermark-mark";
    mark.textContent = settings.watermarkText;
    layer.append(mark);
  }

  return layer;
}

function updateControls() {
  elements.marginValue.value = `${elements.margin.value} mm`;
  elements.gapValue.value = `${elements.gap.value} mm`;
  elements.opacityValue.value = `${elements.watermarkOpacity.value}%`;
  elements.fontSizeValue.value = `${elements.watermarkSize.value} pt`;
  elements.imageCount.textContent = `${state.images.length} selected`;
  elements.generatePdf.disabled = state.images.length === 0;
  elements.clearImages.disabled = state.images.length === 0;
}

function render() {
  updateControls();
  renderImageList();
  renderPreview();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function getPdfFormat(settings) {
  if (settings.pageSize === "square") {
    return [210, 210];
  }

  return settings.pageSize;
}

function getGridSlots(pageWidth, pageHeight, settings) {
  const layout = layoutMap[settings.imagesPerPage];
  const usableWidth = pageWidth - settings.margin * 2;
  const usableHeight = pageHeight - settings.margin * 2;
  const totalGapX = settings.gap * (layout.columns - 1);
  const totalGapY = settings.gap * (layout.rows - 1);
  const slotWidth = (usableWidth - totalGapX) / layout.columns;
  const slotHeight = (usableHeight - totalGapY) / layout.rows;
  const slots = [];

  for (let row = 0; row < layout.rows; row += 1) {
    for (let column = 0; column < layout.columns; column += 1) {
      slots.push({
        x: settings.margin + column * (slotWidth + settings.gap),
        y: settings.margin + row * (slotHeight + settings.gap),
        width: slotWidth,
        height: slotHeight,
      });
    }
  }

  return slots;
}

function getContainBox(image, slot) {
  const imageRatio = image.width / image.height;
  const slotRatio = slot.width / slot.height;

  if (imageRatio > slotRatio) {
    const height = slot.width / imageRatio;
    return {
      x: slot.x,
      y: slot.y + (slot.height - height) / 2,
      width: slot.width,
      height,
    };
  }

  const width = slot.height * imageRatio;
  return {
    x: slot.x + (slot.width - width) / 2,
    y: slot.y,
    width,
    height: slot.height,
  };
}

function canvasToJpeg(image) {
  return new Promise((resolve, reject) => {
    const source = new Image();
    source.onload = () => {
      const maxSide = 2400;
      const scale = Math.min(1, maxSide / Math.max(source.naturalWidth, source.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));

      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    source.onerror = () => reject(new Error(`Could not prepare ${image.name}.`));
    source.src = image.src;
  });
}

function coverToSlotJpeg(image, slotRatio) {
  return new Promise((resolve, reject) => {
    const source = new Image();
    source.onload = () => {
      const sourceRatio = source.naturalWidth / source.naturalHeight;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = source.naturalWidth;
      let sourceHeight = source.naturalHeight;

      if (sourceRatio > slotRatio) {
        sourceWidth = source.naturalHeight * slotRatio;
        sourceX = (source.naturalWidth - sourceWidth) / 2;
      } else {
        sourceHeight = source.naturalWidth / slotRatio;
        sourceY = (source.naturalHeight - sourceHeight) / 2;
      }

      const maxSide = 2400;
      const outputWidth =
        slotRatio >= 1
          ? Math.min(maxSide, Math.max(1, Math.round(sourceWidth)))
          : Math.max(1, Math.round(Math.min(maxSide, sourceHeight) * slotRatio));
      const outputHeight =
        slotRatio >= 1
          ? Math.max(1, Math.round(outputWidth / slotRatio))
          : Math.min(maxSide, Math.max(1, Math.round(sourceHeight)));
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        source,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    source.onerror = () => reject(new Error(`Could not prepare ${image.name}.`));
    source.src = image.src;
  });
}

async function addImageToPdf(doc, image, slot, fit) {
  if (fit === "cover") {
    const jpeg = await coverToSlotJpeg(image, slot.width / slot.height);
    doc.addImage(jpeg, "JPEG", slot.x, slot.y, slot.width, slot.height);
    return;
  }

  const jpeg = await canvasToJpeg(image);
  const box = getContainBox(image, slot);
  doc.addImage(jpeg, "JPEG", box.x, box.y, box.width, box.height);
}

function setPdfOpacity(doc, opacity) {
  if (typeof doc.GState === "function" && typeof doc.setGState === "function") {
    doc.setGState(new doc.GState({ opacity }));
  }
}

function addWatermarkToPdf(doc, settings, pageWidth, pageHeight) {
  if (!settings.watermarkEnabled || !settings.watermarkText) return;

  const text = settings.watermarkText;
  const margin = Math.max(8, settings.margin);
  doc.saveGraphicsState?.();
  setPdfOpacity(doc, settings.watermarkOpacity);
  doc.setTextColor(200, 82, 44);
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(settings.watermarkSize);

  if (isPatternWatermark(settings)) {
    const columns = pageWidth > pageHeight ? 4 : 3;
    const rows = pageWidth > pageHeight ? 3 : 5;
    const angle = getWatermarkAngle(settings);

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        doc.text(text.toUpperCase(), ((column + 0.5) * pageWidth) / columns, ((row + 0.5) * pageHeight) / rows, {
          align: "center",
          angle,
          baseline: "middle",
        });
      }
    }
  } else if (settings.watermarkPlacement === "footer") {
    doc.text(text, pageWidth / 2, pageHeight - margin / 2, { align: "center" });
  } else if (settings.watermarkPlacement === "top") {
    doc.text(text, pageWidth / 2, margin / 2 + settings.watermarkSize * 0.22, {
      align: "center",
    });
  } else {
    const angle = getWatermarkAngle(settings);
    doc.text(text, pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle,
      baseline: "middle",
    });
  }

  if (typeof doc.restoreGraphicsState === "function") {
    doc.restoreGraphicsState();
  } else {
    setPdfOpacity(doc, 1);
  }
}

async function generatePdf() {
  if (!state.images.length) {
    showToast("Add at least one image first.");
    return;
  }

  if (!window.jspdf?.jsPDF) {
    showToast("PDF library is still loading. Try again in a moment.");
    return;
  }

  const settings = getSettings();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: settings.orientation,
    unit: "mm",
    format: getPdfFormat(settings),
    compress: true,
  });

  const pages = chunkImages(state.images, settings.imagesPerPage);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  elements.generatePdf.disabled = true;
  elements.generatePdf.innerHTML = '<i data-lucide="loader-circle" aria-hidden="true"></i> Making...';
  window.lucide?.createIcons();

  try {
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      if (pageIndex > 0) {
        doc.addPage(getPdfFormat(settings), settings.orientation);
      }

      const slots = getGridSlots(pageWidth, pageHeight, settings);
      const pageImages = pages[pageIndex];

      if (settings.watermarkLayer === "behind") {
        addWatermarkToPdf(doc, settings, pageWidth, pageHeight);
      }

      for (let imageIndex = 0; imageIndex < pageImages.length; imageIndex += 1) {
        await addImageToPdf(doc, pageImages[imageIndex], slots[imageIndex], settings.imageFit);
      }

      if (settings.watermarkLayer === "front") {
        addWatermarkToPdf(doc, settings, pageWidth, pageHeight);
      }
    }

    doc.save(getPdfFileName(settings.pdfName));
    showToast("PDF created.");
  } catch (error) {
    showToast(error.message || "Could not create the PDF.");
  } finally {
    elements.generatePdf.innerHTML = '<i data-lucide="file-down" aria-hidden="true"></i> Make PDF';
    updateControls();
    window.lucide?.createIcons();
  }
}

function bindEvents() {
  elements.imageInput.addEventListener("change", (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  });

  elements.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("drag-over");
  });

  elements.dropZone.addEventListener("dragleave", () => {
    elements.dropZone.classList.remove("drag-over");
  });

  elements.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("drag-over");
    addFiles(event.dataTransfer.files);
  });

  elements.dropZone.addEventListener("click", () => {
    elements.imageInput.click();
  });

  elements.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      elements.imageInput.click();
    }
  });

  elements.clearImages.addEventListener("click", () => {
    state.images = [];
    render();
    showToast("Images cleared.");
  });

  elements.generatePdf.addEventListener("click", generatePdf);

  [
    elements.pageSize,
    elements.orientation,
    elements.layout,
    elements.imageFit,
    elements.pdfName,
    elements.margin,
    elements.gap,
    elements.watermarkEnabled,
    elements.watermarkText,
    elements.watermarkPlacement,
    elements.watermarkLayer,
    elements.watermarkOpacity,
    elements.watermarkSize,
  ].forEach((element) => {
    element.addEventListener("input", render);
    element.addEventListener("change", render);
  });
}

bindEvents();
render();
