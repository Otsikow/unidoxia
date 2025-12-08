import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CourseCard, Course } from "@/components/student/CourseCard";
import {
  FiltersBar,
  FilterOptions,
  ActiveFilters,
} from "@/components/student/FiltersBar";

import { LoadingState } from "@/components/LoadingState";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, X, Sparkles } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { useDebounce } from "@/hooks/useDebounce";
import BackButton from "@/components/BackButton";
import { SEO } from "@/components/SEO";
import { ProgramSearchView } from "@/components/course-discovery/ProgramSearchView";

const ITEMS_PER_PAGE = 12;

const DEFAULT_TENANT_SLUG =
  import.meta.env.VITE_DEFAULT_TENANT_SLUG ?? "unidoxia";

const DEFAULT_TUITION_RANGE = {
  min: 0,
  max: 100000,
  currency: "USD*",
} as const;

const DEFAULT_DURATION_RANGE = { min: 0, max: 60 } as const;

const createDefaultFilterOptions = (): FilterOptions => ({
  countries: [],
  levels: [],
  disciplines: [],
  tuition_range: { ...DEFAULT_TUITION_RANGE },
  duration_range: { ...DEFAULT_DURATION_RANGE },
});

const createDefaultActiveFilters = (): ActiveFilters => ({
  countries: [],
  levels: [],
  tuitionRange: [DEFAULT_TUITION_RANGE.min, DEFAULT_TUITION_RANGE.max],
  durationRange: [DEFAULT_DURATION_RANGE.min, DEFAULT_DURATION_RANGE.max],
  intakeMonths: [],
});

const getNextIntakeYear = (month: number): number => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return month < currentMonth ? currentYear + 1 : currentYear;
};

/**
 * FALLBACK SAMPLE COURSES (used when Supabase fails or no live data exists)
 */
const FALLBACK_PROGRAMMES: Course[] = [
  {
    id: "fallback-oxford-cs-msc",
    university_id: "fallback-oxford",
    name: "MSc Computer Science",
    level: "Postgraduate",
    discipline: "Computer Science",
    duration_months: 12,
    tuition_currency: "GBP",
    tuition_amount: 42000,
    intake_months: [9],
    university_name: "University of Oxford",
    university_country: "United Kingdom",
    university_city: "Oxford",
    university_logo_url: null,
    next_intake_month: 9,
    next_intake_year: getNextIntakeYear(9),
    instant_submission: true,
  },
  {
    id: "fallback-harvard-mba",
    university_id: "fallback-harvard",
    name: "MBA (Leadership & Strategy)",
    level: "Postgraduate",
    discipline: "Business Administration",
    duration_months: 24,
    tuition_currency: "USD",
    tuition_amount: 73000,
    intake_months: [1, 9],
    university_name: "Harvard University",
    university_country: "United States",
    university_city: "Cambridge",
    university_logo_url: null,
    next_intake_month: 1,
    next_intake_year: getNextIntakeYear(1),
  },
  {
    id: "fallback-toronto-bsc-data",
    university_id: "fallback-toronto",
    name: "BSc Data Science & Analytics",
    level: "Undergraduate",
    discipline: "Data Science",
    duration_months: 48,
    tuition_currency: "CAD",
    tuition_amount: 41000,
    intake_months: [1, 5, 9],
    university_name: "University of Toronto",
    university_country: "Canada",
    university_city: "Toronto",
    university_logo_url: null,
    next_intake_month: 1,
    next_intake_year: getNextIntakeYear(1),
    is_unidoxia_partner: true,
  },
  {
    id: "fallback-melbourne-meng",
    university_id: "fallback-melbourne",
    name: "Master of Engineering (Software)",
    level: "Postgraduate",
    discipline: "Engineering",
    duration_months: 24,
    tuition_currency: "AUD",
    tuition_amount: 52000,
    intake_months: [2, 7],
    university_name: "University of Melbourne",
    university_country: "Australia",
    university_city: "Melbourne",
    university_logo_url: null,
    next_intake_month: 2,
    next_intake_year: getNextIntakeYear(2),
  },
  {
    id: "fallback-mit-eecs",
    university_id: "fallback-mit",
    name: "SB Electrical Engineering and Computer Science",
    level: "Undergraduate",
    discipline: "Computer Science",
    duration_months: 48,
    tuition_currency: "USD",
    tuition_amount: 59750,
    intake_months: [9],
    university_name: "Massachusetts Institute of Technology",
    university_country: "United States",
    university_city: "Cambridge, MA",
    university_logo_url: null,
    next_intake_month: 9,
    next_intake_year: getNextIntakeYear(9),
  },
  {
    id: "fallback-ubc-msc-energy",
    university_id: "fallback-ubc",
    name: "MSc Sustainable Energy Systems",
    level: "Postgraduate",
    discipline: "Sustainability",
    duration_months: 18,
    tuition_currency: "CAD",
    tuition_amount: 36000,
    intake_months: [5],
    university_name: "University of British Columbia",
    university_country: "Canada",
    university_city: "Vancouver",
    university_logo_url: null,
    next_intake_month: 5,
    next_intake_year: getNextIntakeYear(5),
  },
  {
    id: "fallback-imperial-msc-robotics",
    university_id: "fallback-imperial",
    name: "MSc Robotics & Autonomous Systems",
    level: "Postgraduate",
    discipline: "Robotics",
    duration_months: 12,
    tuition_currency: "GBP",
    tuition_amount: 41000,
    intake_months: [10],
    university_name: "Imperial College London",
    university_country: "United Kingdom",
    university_city: "London",
    university_logo_url: null,
    next_intake_month: 10,
    next_intake_year: getNextIntakeYear(10),
  },
  {
    id: "fallback-sydney-mph",
    university_id: "fallback-sydney",
    name: "Master of Public Health",
    level: "Postgraduate",
    discipline: "Public Health",
    duration_months: 18,
    tuition_currency: "AUD",
    tuition_amount: 38000,
    intake_months: [3, 7],
    university_name: "University of Sydney",
    university_country: "Australia",
    university_city: "Sydney",
    university_logo_url: null,
    next_intake_month: 3,
    next_intake_year: getNextIntakeYear(3),
  },
  {
    id: "fallback-stanford-msce",
    university_id: "fallback-stanford",
    name: "MS Computer Engineering",
    level: "Postgraduate",
    discipline: "Computer Engineering",
    duration_months: 24,
    tuition_currency: "USD",
    tuition_amount: 60000,
    intake_months: [9],
    university_name: "Stanford University",
    university_country: "United States",
    university_city: "Stanford",
    university_logo_url: null,
    next_intake_month: 9,
    next_intake_year: getNextIntakeYear(9),
  },
  {
    id: "fallback-eth-msc-data",
    university_id: "fallback-eth",
    name: "MSc Data Science",
    level: "Postgraduate",
    discipline: "Data Science",
    duration_months: 18,
    tuition_currency: "CHF",
    tuition_amount: 25000,
    intake_months: [2, 9],
    university_name: "ETH Zürich",
    university_country: "Switzerland",
    university_city: "Zürich",
    university_logo_url: null,
    next_intake_month: 2,
    next_intake_year: getNextIntakeYear(2),
  },
  {
    id: "fallback-tokyo-msc-quantum",
    university_id: "fallback-tokyo",
    name: "MSc Quantum Computing",
    level: "Postgraduate",
    discipline: "Physics",
    duration_months: 24,
    tuition_currency: "JPY",
    tuition_amount: 4600000,
    intake_months: [4],
    university_name: "The University of Tokyo",
    university_country: "Japan",
    university_city: "Tokyo",
    university_logo_url: null,
    next_intake_month: 4,
    next_intake_year: getNextIntakeYear(4),
  },
  {
    id: "fallback-trinity-msc-cs",
    university_id: "fallback-trinity",
    name: "MSc Computer Science",
    level: "Postgraduate",
    discipline: "Computer Science",
    duration_months: 12,
    tuition_currency: "EUR",
    tuition_amount: 24500,
    intake_months: [9],
    university_name: "Trinity College Dublin",
    university_country: "Ireland",
    university_city: "Dublin",
    university_logo_url: null,
    next_intake_month: 9,
    next_intake_year: getNextIntakeYear(9),
  },
  {
    id: "fallback-uc-berkeley-msds",
    university_id: "fallback-uc-berkeley",
    name: "Master of Information & Data Science",
    level: "Postgraduate",
    discipline: "Information Science",
    duration_months: 20,
    tuition_currency: "USD",
    tuition_amount: 52000,
    intake_months: [1, 5, 9],
    university_name: "University of California, Berkeley",
    university_country: "United States",
    university_city: "Berkeley",
    university_logo_url: null,
    next_intake_month: 1,
    next_intake_year: getNextIntakeYear(1),
  },
];
