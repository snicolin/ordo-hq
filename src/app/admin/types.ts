export type Page = {
  id: string;
  label: string;
  slug: string;
  order: number;
  isHome: boolean;
  sections?: PageSectionJoin[];
};

export type Section = {
  id: string;
  title: string;
  hideTitle: boolean;
  displayType: "BUTTON" | "LINK" | "TILE" | "METRIC" | "TEXT" | "COUNTDOWN";
  content?: string | null;
  targetDate?: string | null;
  items?: Item[];
  pages?: { pageId: string; sectionId: string; order: number; page: Page }[];
};

export type PageSectionJoin = {
  pageId: string;
  sectionId: string;
  order: number;
  section: Section;
};

export type Item = {
  id: string;
  sectionId: string;
  name: string;
  href: string;
  description: string | null;
  image: string | null;
  value: string | null;
  apiUrl: string | null;
  apiField: string | null;
  disabled: boolean;
  order: number;
  pages?: { itemId: string; pageId: string }[];
  section?: Section;
};
