export type {
  Project,
  Plot,
  Enquiry,
  Admin,
  Media,
  CmsSection,
  SiteSettings,
  ProjectStatus,
  PlotStatus,
  EnquiryStatus,
  Accent,
  MediaKind,
} from "@prisma/client";

import type { Project, Plot, Media, Enquiry } from "@prisma/client";

export interface DashboardStats {
  totalProjects: number;
  publishedProjects: number;
  totalPlots: number;
  plotsAvailable: number;
  plotsReserved: number;
  plotsSold: number;
  newEnquiries: number;
  totalEnquiries: number;
  totalMedia: number;
  /** Sum of `price` across plots whose status is SOLD. */
  soldValue: number;
}

export type ProjectWithCounts = Project & {
  _count: { plots: number; enquiries: number; media: number };
};

export type PlotWithProject = Plot & { project: Project };

export type PlotWithProjectAndMedia = Plot & {
  project: Project;
  media: Media[];
};

export type EnquiryWithRelations = Enquiry & {
  project: Project | null;
  plot: Plot | null;
};

export type ProjectWithRelations = Project & {
  plots: Plot[];
  media: Media[];
};

/** Slim option shape used by <select> controls in the admin. */
export interface ProjectOption {
  id: string;
  name: string;
  slug: string;
}
