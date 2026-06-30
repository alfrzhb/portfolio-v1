const MODAL_TYPE_TO_DATA_KEY = {
  project_list: "projects",
  skill_list: "skills",
  education_list: "education",
  professional_list: "professional",
  organization_list: "organization",
  achievement_list: "achievements",
  contact_list: "contact",
};

const DATA_SOURCE_TO_DATA_KEY = {
  "assets/data/projects.json": "projects",
  "assets/data/skills.json": "skills",
  "assets/data/education.json": "education",
  "assets/data/professional.json": "professional",
  "assets/data/organization.json": "organization",
  "assets/data/achievements.json": "achievements",
  "assets/data/contact.json": "contact",
};

const HIDDEN_FIELD_KEYS = new Set([
  "id",
  "asset",
  "section_asset",
  "image",
  "icon",
  "certificate_url",
  "certificate_preview",
  "certificate",
  "preview",
  "certificate_label",
  "href",
  "value",
  "data_source",
  "download",
  "download_filename",
  "viewer_mode",
  "fallback_action",
]);

const FRIENDLY_LABELS = {
  tech_stack: "Tech Stack",
  display_value: "Value",
  related_project: "Related Project",
  certificate_label: "Certificate",
};

const PDF_PATH_KEYS = ["certificate_url", "certificate", "pdf", "file", "href", "value"];
const PREVIEW_PATH_KEYS = ["certificate_preview", "preview", "image"];

function createElement(tagName, className, textContent = "") {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }
  if (textContent) {
    element.textContent = textContent;
  }

  return element;
}

function getFriendlyLabel(key) {
  return (
    FRIENDLY_LABELS[key] ??
    key
      .replaceAll("_", " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

function appendList(parent, values) {
  if (!Array.isArray(values) || values.length === 0) {
    return;
  }

  const list = createElement("ul", "modal-list");

  values.forEach((value) => {
    const item = createElement("li", "");
    item.textContent = typeof value === "object" ? getItemTitle(value) : String(value);
    list.append(item);
  });

  parent.append(list);
}

function getNestedValue(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object);
}

function getFirstString(object, paths) {
  for (const path of paths) {
    const value = getNestedValue(object, path);

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
}

function isPdfPath(value) {
  return typeof value === "string" && /\.pdf(?:$|[?#])/i.test(value);
}

function isImagePath(value) {
  return typeof value === "string" && /\.(png|jpe?g|webp|gif)(?:$|[?#])/i.test(value);
}

function getFileNameFromPath(path, fallback = "document.pdf") {
  if (!path || typeof path !== "string") {
    return fallback;
  }

  const cleanPath = path.split(/[?#]/)[0];
  return cleanPath.split("/").pop() || fallback;
}

function getDocumentPath(item, keys) {
  const directPath = getFirstString(item, keys);

  if (isPdfPath(directPath)) {
    return directPath;
  }

  const linkPaths = keys.map((key) => `links.${key}`);
  const linkedPath = getFirstString(item, linkPaths);

  return isPdfPath(linkedPath) ? linkedPath : "";
}

function getPreviewPath(item) {
  const directPath = getFirstString(item, PREVIEW_PATH_KEYS);

  if (isImagePath(directPath)) {
    return directPath;
  }

  const linkedPath = getFirstString(
    item,
    PREVIEW_PATH_KEYS.map((key) => `links.${key}`),
  );

  return isImagePath(linkedPath) ? linkedPath : "";
}

function resolveCertificateDocument(item) {
  return {
    pdfPath: getDocumentPath(item, PDF_PATH_KEYS),
    previewPath: getPreviewPath(item),
    downloadName:
      item.download_filename ??
      item.downloadName ??
      getFileNameFromPath(getDocumentPath(item, PDF_PATH_KEYS), "certificate.pdf"),
  };
}

function resolveCvDocument(cvData, contactItems = []) {
  const buttons = Array.isArray(cvData?.ui?.primary_buttons) ? cvData.ui.primary_buttons : [];
  const viewButton = buttons.find((button) => button.action === "open_pdf_new_tab") ?? {};
  const downloadButton = buttons.find((button) => button.action === "download_file") ?? {};
  const contactCvItem =
    contactItems.find((item) => item?.type === "file" || item?.action === "open_cv_scroll_modal") ??
    {};
  const pdfPath =
    getFirstString(viewButton, ["href"]) ||
    getFirstString(downloadButton, ["href"]) ||
    getFirstString(cvData, ["meta.source_file"]) ||
    getDocumentPath(contactCvItem, PDF_PATH_KEYS);

  return {
    pdfPath,
    viewLabel: "View PDF",
    downloadLabel: "Download PDF",
    downloadName:
      downloadButton.download_filename ??
      contactCvItem.download_filename ??
      getFileNameFromPath(pdfPath, "CV_Muhammad_Alfarizi_Habibullah.pdf"),
  };
}

function getModalItems(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.projects)) {
    return data.projects;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.entries)) {
    return data.entries;
  }

  return [];
}

function isExternalSafeLink(value) {
  return typeof value === "string" && /^(https?:|mailto:)/i.test(value);
}

function appendLinks(parent, links) {
  if (!links || typeof links !== "object") {
    return;
  }

  const validLinks = Object.entries(links).filter(([, value]) => isExternalSafeLink(value));

  if (validLinks.length === 0) {
    return;
  }

  const group = createElement("div", "modal-links");

  validLinks.forEach(([key, value]) => {
    const link = createElement("a", "modal-link", getFriendlyLabel(key));
    link.href = value;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    group.append(link);
  });

  parent.append(group);
}

function getItemTitle(item) {
  return (
    item.name ??
    item.title ??
    item.label ??
    item.category ??
    item.institution ??
    item.company ??
    item.role ??
    "Untitled"
  );
}

function appendField(parent, key, value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    HIDDEN_FIELD_KEYS.has(key) ||
    key === "links"
  ) {
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return;
    }

    const section = createElement("div", "modal-field");
    section.append(createElement("h4", "", getFriendlyLabel(key)));
    appendList(section, value);
    parent.append(section);
    return;
  }

  if (typeof value === "object") {
    return;
  }

  const field = createElement("p", "modal-meta");
  const label = createElement("strong", "", `${getFriendlyLabel(key)}:`);
  field.append(label, ` ${String(value)}`);
  parent.append(field);
}

function renderCard(item) {
  const card = createElement("article", "modal-card");
  const title = createElement("h3", "", getItemTitle(item));

  card.append(title);

  Object.entries(item).forEach(([key, value]) => appendField(card, key, value));
  appendLinks(card, item.links);

  const certificateInfo = resolveCertificateDocument(item);

  if (certificateInfo.pdfPath || certificateInfo.previewPath) {
    renderCertificateViewer(item, card);
  }

  return card;
}

function renderSkills(data, content) {
  (data.groups ?? []).forEach((group) => {
    const card = createElement("article", "modal-card");

    card.append(createElement("h3", "", group.category ?? "Skills"));
    (group.skills ?? []).forEach((skill) => {
      const skillLine = createElement("p", "modal-meta");
      const skillName = createElement("strong", "", skill.name ?? "Skill");
      skillLine.append(skillName, skill.level ? ` - ${skill.level}` : "");
      card.append(skillLine);

      if (skill.notes) {
        card.append(createElement("p", "", skill.notes));
      }
    });
    content.append(card);
  });

  if (Array.isArray(data.certification_learning)) {
    const card = createElement("article", "modal-card");
    card.append(createElement("h3", "", "Certification Learning"));
    appendList(card, data.certification_learning);
    content.append(card);
  }
}

function createDocumentActions({ pdfPath, viewLabel = "View PDF", downloadLabel = "Download PDF", downloadName }) {
  const actions = createElement("div", "modal-document-actions");

  if (!pdfPath) {
    actions.append(createElement("p", "modal-note", "PDF file is not available yet."));
    return actions;
  }

  const viewLink = createElement("a", "modal-link", viewLabel);
  viewLink.href = pdfPath;
  viewLink.target = "_blank";
  viewLink.rel = "noopener noreferrer";

  const downloadLink = createElement("a", "modal-link", downloadLabel);
  downloadLink.href = pdfPath;
  downloadLink.download = downloadName ?? getFileNameFromPath(pdfPath);
  downloadLink.rel = "noopener noreferrer";

  actions.append(viewLink, downloadLink);
  return actions;
}

function appendPreview(parent, previewPath, altText) {
  const previewFrame = createElement("figure", "modal-certificate-frame");

  if (!previewPath) {
    previewFrame.append(createElement("figcaption", "", "Preview image is not available."));
    parent.append(previewFrame);
    return;
  }

  const image = document.createElement("img");
  image.src = previewPath;
  image.alt = altText;
  image.loading = "lazy";
  previewFrame.append(image);
  parent.append(previewFrame);
}

function renderCertificateViewer(item, parent) {
  const documentInfo = resolveCertificateDocument(item);
  const label = item.certificate_label ?? "Certificate";
  const wrapper = createElement("section", "modal-document-section");

  wrapper.append(createElement("h4", "", label));
  appendPreview(wrapper, documentInfo.previewPath, `${getItemTitle(item)} certificate preview`);
  wrapper.append(
    createDocumentActions({
      pdfPath: documentInfo.pdfPath,
      viewLabel: "View PDF",
      downloadLabel: "Download PDF",
      downloadName: documentInfo.downloadName,
    }),
  );
  parent.append(wrapper);
}

function renderContact(data, content, portfolioData) {
  getModalItems(data).forEach((item) => {
    if (item.type === "file" || item.action === "open_cv_scroll_modal") {
      return;
    }

    const card = createElement("article", "modal-card modal-contact-card");
    const title = createElement("h3", "", item.label ?? "Contact");

    card.append(title);

    const value = item.display_value ?? item.value ?? "";

    if (isExternalSafeLink(item.href)) {
      const link = createElement("a", "modal-link", value || item.href);
      link.href = item.href;
      link.target = item.href.startsWith("mailto:") ? "_self" : "_blank";
      link.rel = "noopener noreferrer";
      card.append(link);
    } else if (value) {
      card.append(createElement("p", "", value));
    }

    content.append(card);
  });

  renderCvViewer(portfolioData?.cv, getModalItems(data), content);
  renderCertificateList(portfolioData, content);
}

function renderCvViewer(cvData, contactItems, content) {
  const card = createElement("article", "modal-card modal-cv-card");

  if (!cvData || typeof cvData !== "object") {
    card.append(createElement("h3", "", "CV"));
    card.append(createElement("p", "", "CV data is not available."));
    content.append(card);
    return;
  }

  const documentInfo = resolveCvDocument(cvData, contactItems);
  const title = cvData.ui?.title ?? "CV";
  const subtitle = cvData.ui?.subtitle ?? cvData.personal?.full_name ?? "";
  const summary = cvData.profile?.short_summary ?? cvData.profile?.summary ?? "";

  card.append(createElement("h3", "", title));
  if (subtitle) {
    card.append(createElement("p", "modal-meta", subtitle));
  }
  if (summary) {
    card.append(createElement("p", "", summary));
  }

  const sections = Array.isArray(cvData.scroll_preview?.sections)
    ? cvData.scroll_preview.sections
    : [];

  if (sections.length > 0) {
    const scroll = createElement("div", "modal-cv-scroll");

    sections.forEach((section) => {
      const block = createElement("section", "modal-cv-scroll-section");
      block.append(createElement("h4", "", section.heading ?? "Section"));
      block.append(createElement("p", "", section.body ?? ""));
      scroll.append(block);
    });
    card.append(scroll);
  }

  card.append(
    createDocumentActions({
      pdfPath: documentInfo.pdfPath,
      viewLabel: documentInfo.viewLabel,
      downloadLabel: documentInfo.downloadLabel,
      downloadName: documentInfo.downloadName,
    }),
  );
  content.append(card);
}

function collectCertificatesFromItems(items, sourceLabel) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => {
      const documentInfo = resolveCertificateDocument(item);
      return Boolean(documentInfo.pdfPath || documentInfo.previewPath);
    })
    .map((item) => ({
      ...item,
      source_label: sourceLabel,
    }));
}

function collectCertificates(portfolioData) {
  const certificates = [
    ...collectCertificatesFromItems(portfolioData?.cv?.education?.items, "Education"),
    ...collectCertificatesFromItems(portfolioData?.cv?.competition_experience?.items, "Achievement"),
    ...collectCertificatesFromItems(portfolioData?.education?.items, "Education"),
    ...collectCertificatesFromItems(portfolioData?.achievements?.items, "Achievement"),
  ];
  const seen = new Set();

  return certificates.filter((certificate) => {
    const documentInfo = resolveCertificateDocument(certificate);
    const key = documentInfo.pdfPath || documentInfo.previewPath || certificate.id;

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function renderCertificateList(portfolioData, content) {
  const certificates = collectCertificates(portfolioData);
  const section = createElement("article", "modal-card modal-certificates-card");

  section.append(createElement("h3", "", "Certificates"));

  if (certificates.length === 0) {
    section.append(createElement("p", "", "Certificate data is not available."));
    content.append(section);
    return;
  }

  const list = createElement("div", "modal-certificate-list");

  certificates.forEach((certificate) => {
    const card = createElement("section", "modal-certificate-item");
    const documentInfo = resolveCertificateDocument(certificate);
    const title =
      certificate.name ??
      certificate.program ??
      certificate.event ??
      certificate.award ??
      certificate.institution ??
      "Certificate";
    const issuer = certificate.issuer ?? certificate.institution ?? certificate.event ?? "";

    card.append(createElement("h4", "", title));
    if (issuer) {
      card.append(createElement("p", "modal-meta", issuer));
    }
    if (certificate.source_label) {
      card.append(createElement("p", "modal-note", certificate.source_label));
    }
    appendPreview(card, documentInfo.previewPath, `${title} preview`);
    card.append(
      createDocumentActions({
        pdfPath: documentInfo.pdfPath,
        viewLabel: "View PDF",
        downloadLabel: "Download PDF",
        downloadName: documentInfo.downloadName,
      }),
    );
    list.append(card);
  });

  section.append(list);
  content.append(section);
}

function renderEmptyState(content, message) {
  const card = createElement("article", "modal-card");

  card.append(createElement("h3", "", "No Data"));
  card.append(createElement("p", "", message));
  content.append(card);
}

function renderGenericItems(data, content, fallbackMessage = "No data available.") {
  const items = getModalItems(data);

  if (items.length === 0) {
    console.warn("Alfarizi Plaza: modal data has no renderable items.", data);
    renderEmptyState(content, fallbackMessage);
    return;
  }

  items.forEach((item) => {
    content.append(renderCard(item));
  });
}

function renderModalContent(state, elements, portfolioData) {
  const { content, title, description } = elements;
  const data = state.data ?? {};

  title.textContent = state.title ?? data.title ?? "Portfolio";
  description.textContent = data.description ?? "";
  content.replaceChildren();

  if (state.category === "skill_list") {
    if (!Array.isArray(data.groups) || data.groups.length === 0) {
      renderEmptyState(content, "No skill data available.");
      return;
    }

    renderSkills(data, content);
    return;
  }

  if (state.category === "contact_list") {
    if (getModalItems(data).length === 0) {
      renderEmptyState(content, "No contact data available.");
      return;
    }

    renderContact(data, content, portfolioData);
    return;
  }

  const fallbackMessages = {
    project_list: "No project data available.",
    education_list: "No education data available.",
    professional_list: "No professional data available.",
    organization_list: "No organization data available.",
    achievement_list: "No achievement data available.",
  };

  renderGenericItems(data, content, fallbackMessages[state.category] ?? "No data available.");
}

function resolveDataKey(action) {
  return (
    MODAL_TYPE_TO_DATA_KEY[action?.modal_type] ??
    DATA_SOURCE_TO_DATA_KEY[action?.data_source] ??
    null
  );
}

export function createModalManager(rootElement, portfolioData) {
  const state = {
    isOpen: false,
    title: "",
    category: "",
    data: null,
  };
  const elements = {
    title: rootElement.querySelector("[data-modal-title]"),
    description: rootElement.querySelector("[data-modal-description]"),
    content: rootElement.querySelector("[data-modal-content]"),
    closeButton: rootElement.querySelector("[data-modal-close]"),
  };

  function render() {
    rootElement.hidden = !state.isOpen;
    document.body.classList.toggle("modal-open", state.isOpen);

    if (state.isOpen) {
      renderModalContent(state, elements, portfolioData);
    }
  }

  function openModal(modalPayload) {
    state.isOpen = true;
    state.title = modalPayload.title;
    state.category = modalPayload.category;
    state.data = modalPayload.data;
    render();
  }

  function openInteractionModal(interaction) {
    const action = interaction?.action;

    if (!action || action.type !== "modal") {
      return false;
    }

    const dataKey = resolveDataKey(action);
    const data = dataKey ? portfolioData[dataKey] : null;
    const itemCount = data ? getModalItems(data).length || data.groups?.length || 0 : 0;

    console.info("Alfarizi Plaza modal open:", {
      modalType: action.modal_type,
      targetId: interaction.target_id,
      interactionId: interaction.id,
      dataKey,
      dataFound: Boolean(data),
      itemCount,
    });

    if (!data) {
      console.warn("Alfarizi Plaza: modal data not found for interaction.", interaction);
      openModal({
        title: action.title ?? interaction.label ?? "Portfolio",
        category: action.modal_type ?? "unknown",
        data: {
          title: action.title ?? interaction.label ?? "Portfolio",
          description: "Data belum tersedia.",
          items: [],
        },
      });
      return true;
    }

    openModal({
      title: action.title ?? data.title ?? interaction.label,
      category: action.modal_type,
      data,
    });
    return true;
  }

  function closeModal() {
    state.isOpen = false;
    state.title = "";
    state.category = "";
    state.data = null;
    render();
  }

  function isOpen() {
    return state.isOpen;
  }

  function getModalState() {
    return {
      isOpen: state.isOpen,
      title: state.title,
      category: state.category,
      data: state.data,
    };
  }

  elements.closeButton?.addEventListener("click", closeModal);
  rootElement.addEventListener("click", (event) => {
    if (event.target === rootElement) {
      closeModal();
    }
  });
  render();

  return {
    openModal,
    openInteractionModal,
    closeModal,
    isOpen,
    getModalState,
  };
}
