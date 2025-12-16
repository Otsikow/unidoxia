/**
 * Centralized icon exports for better tree-shaking
 * Import icons from here instead of directly from lucide-react
 * This ensures only used icons are bundled
 */

// Most commonly used icons across the app
export {
  // Navigation & Actions
  Home,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  
  // User & Profile
  User,
  UserCircle,
  Users,
  UserPlus,
  UserCheck,
  
  // Documents & Files
  FileText,
  File,
  Files,
  FileCheck,
  FileWarning,
  Download,
  Upload,
  
  // Communication
  Mail,
  MessageSquare,
  MessageCircle,
  Bell,
  BellOff,
  Send,
  
  // Status & Feedback
  Check,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  Clock,
  
  // Actions
  Edit,
  Trash,
  Trash2,
  Plus,
  Minus,
  Search,
  Filter,
  Settings,
  MoreVertical,
  MoreHorizontal,
  
  // Business
  Briefcase,
  Building,
  GraduationCap,
  BookOpen,
  Calendar,
  
  // Media
  Image,
  Video,
  Camera,
  Eye,
  EyeOff,
  
  // System
  Loader,
  Loader2,
  RefreshCw,
  Save,
  Copy,
  ExternalLink,
  Link,
  Unlink,
  
  // UI Elements
  Star,
  Heart,
  Bookmark,
  Share,
  Flag,
  
  // Specialized
  Sparkles,
  Calculator,
  TrendingUp,
  TrendingDown,
  BarChart,
  PieChart,
  DollarSign,
  CreditCard,
  
  // Misc
  MapPin,
  Globe,
  Phone,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
} from "lucide-react";

// Re-export type
export type { LucideIcon } from "lucide-react";
