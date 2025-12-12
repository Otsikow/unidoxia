import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  User, 
  Tag,
  Globe,
  FileText,
  Video,
  Image,
  ExternalLink,
  Heart,
  Share2
} from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'guide' | 'template' | 'checklist';
  category: string;
  tags: string[];
  author: string;
  created_at: string;
  read_time?: number;
  views: number;
  likes: number;
  url?: string;
  file_url?: string;
  thumbnail_url?: string;
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  created_at: string;
  updated_at: string;
  category: string;
  tags: string[];
  read_time: number;
  views: number;
  likes: number;
  featured: boolean;
  thumbnail_url?: string;
}

export default function ResourceLibrary() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [activeTab, setActiveTab] = useState('resources');

  const categories = [
    'all', 'visa', 'application', 'scholarship', 'academic', 
    'cultural', 'financial', 'housing', 'career', 'language'
  ];

  const types = ['all', 'article', 'video', 'guide', 'template', 'checklist'];

  useEffect(() => {
    fetchResources();
    fetchBlogPosts();
  }, []);

  const fetchResources = async () => {
    // Mock data - in real implementation, this would fetch from API
    const mockResources: Resource[] = [
      {
        id: '1',
        title: 'Complete Visa Application Guide for Canada',
        description: 'Step-by-step guide to applying for a Canadian student visa, including required documents and common pitfalls to avoid.',
        type: 'guide',
        category: 'visa',
        tags: ['canada', 'visa', 'student', 'immigration'],
        author: 'UniDoxia Team',
        created_at: '2024-01-15',
        read_time: 15,
        views: 1250,
        likes: 89,
        url: '#'
      },
      {
        id: '2',
        title: 'University Application Checklist Template',
        description: 'Downloadable checklist to ensure you have all required documents and information for your university applications.',
        type: 'template',
        category: 'application',
        tags: ['checklist', 'application', 'documents', 'template'],
        author: 'UniDoxia Team',
        created_at: '2024-01-10',
        read_time: 5,
        views: 2100,
        likes: 156,
        file_url: '#'
      },
      {
        id: '3',
        title: 'Scholarship Opportunities for African Students',
        description: 'Comprehensive list of scholarships available for students from African countries studying abroad.',
        type: 'article',
        category: 'scholarship',
        tags: ['scholarship', 'africa', 'funding', 'opportunities'],
        author: 'UniDoxia Team',
        created_at: '2024-01-08',
        read_time: 12,
        views: 3200,
        likes: 234,
        url: '#'
      },
      {
        id: '4',
        title: 'IELTS Preparation Video Series',
        description: 'Complete video series covering all sections of the IELTS exam with practice tests and tips.',
        type: 'video',
        category: 'language',
        tags: ['ielts', 'english', 'test', 'preparation'],
        author: 'UniDoxia Team',
        created_at: '2024-01-05',
        read_time: 45,
        views: 5600,
        likes: 445,
        url: '#',
        thumbnail_url: '/api/placeholder/300/200'
      },
      {
        id: '5',
        title: 'Cultural Adaptation Guide for International Students',
        description: 'Tips and advice for adapting to life in a new country, including cultural differences and social integration.',
        type: 'guide',
        category: 'cultural',
        tags: ['culture', 'adaptation', 'international', 'student-life'],
        author: 'UniDoxia Team',
        created_at: '2024-01-03',
        read_time: 20,
        views: 1800,
        likes: 167,
        url: '#'
      }
    ];

    setResources(mockResources);
  };

  const fetchBlogPosts = async () => {
    // Mock data - in real implementation, this would fetch from API
    const mockBlogPosts: BlogPost[] = [
      {
        id: '1',
        title: 'Top 10 Universities in Canada for International Students',
        excerpt: 'Discover the best Canadian universities that offer excellent courses and support for international students.',
        content: 'Full article content...',
        author: 'UniDoxia Team',
        created_at: '2024-01-20',
        updated_at: '2024-01-20',
        category: 'academic',
        tags: ['canada', 'universities', 'international', 'ranking'],
        read_time: 8,
        views: 4500,
        likes: 312,
        featured: true,
        thumbnail_url: '/api/placeholder/400/250'
      },
      {
        id: '2',
        title: 'How to Write a Winning Statement of Purpose',
        excerpt: 'Learn the essential elements of a compelling statement of purpose that will help you stand out to admissions committees.',
        content: 'Full article content...',
        author: 'UniDoxia Team',
        created_at: '2024-01-18',
        updated_at: '2024-01-18',
        category: 'application',
        tags: ['sop', 'application', 'writing', 'admissions'],
        read_time: 10,
        views: 3200,
        likes: 245,
        featured: false,
        thumbnail_url: '/api/placeholder/400/250'
      },
      {
        id: '3',
        title: 'Financial Planning for Study Abroad: A Complete Guide',
        excerpt: 'Everything you need to know about budgeting, scholarships, and financial aid for your international education.',
        content: 'Full article content...',
        author: 'UniDoxia Team',
        created_at: '2024-01-16',
        updated_at: '2024-01-16',
        category: 'financial',
        tags: ['finance', 'budgeting', 'scholarships', 'planning'],
        read_time: 15,
        views: 2800,
        likes: 198,
        featured: false,
        thumbnail_url: '/api/placeholder/400/250'
      }
    ];

    setBlogPosts(mockBlogPosts);
    setLoading(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return FileText;
      case 'video': return Video;
      case 'guide': return BookOpen;
      case 'template': return Download;
      case 'checklist': return FileText;
      default: return FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'article': return 'bg-info-light text-info dark:bg-info/20';
      case 'video': return 'bg-destructive/10 text-destructive';
      case 'guide': return 'bg-success-light text-success dark:bg-success/20';
      case 'template': return 'bg-accent text-accent-foreground';
      case 'checklist': return 'bg-warning-light text-warning dark:bg-warning/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = searchTerm === '' || 
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesType = selectedType === 'all' || resource.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const filteredBlogPosts = blogPosts.filter(post => {
    const matchesSearch = searchTerm === '' || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Resource Library
          </h2>
          <p className="text-muted-foreground">Access guides, templates, and articles to support your study abroad journey</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="blog">Blog & Articles</TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.slice(1).map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {types.slice(1).map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Resources Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => {
              const TypeIcon = getTypeIcon(resource.type);
              return (
                <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-5 w-5 text-primary" />
                        <Badge className={getTypeColor(resource.type)}>
                          {resource.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Heart className="h-4 w-4" />
                        {resource.likes}
                      </div>
                    </div>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {resource.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1">
                      {resource.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {resource.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{resource.tags.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {resource.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(resource.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span>{resource.views} views</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild className="flex-1">
                        <a href={resource.url || resource.file_url || '#'}>
                          {resource.type === 'video' ? 'Watch' : resource.type === 'template' ? 'Download' : 'Read'}
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="blog" className="space-y-6">
          {/* Featured Post */}
          {filteredBlogPosts.find(post => post.featured) && (
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                      <Badge variant="outline">{filteredBlogPosts.find(post => post.featured)?.category}</Badge>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">
                      {filteredBlogPosts.find(post => post.featured)?.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {filteredBlogPosts.find(post => post.featured)?.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {filteredBlogPosts.find(post => post.featured)?.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(filteredBlogPosts.find(post => post.featured)?.created_at || '').toLocaleDateString()}
                      </span>
                      <span>{filteredBlogPosts.find(post => post.featured)?.read_time} min read</span>
                    </div>
                    <Button asChild>
                      <a href="#">Read Full Article</a>
                    </Button>
                  </div>
                  {filteredBlogPosts.find(post => post.featured)?.thumbnail_url && (
                    <div className="w-64 h-40 bg-muted rounded-lg flex items-center justify-center">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blog Posts */}
          <div className="grid gap-6 md:grid-cols-2">
            {filteredBlogPosts.filter(post => !post.featured).map((post) => (
              <Card key={post.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{post.category}</Badge>
                  </div>
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {post.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {post.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{post.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {post.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span>{post.read_time} min read</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {post.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.likes}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="#">Read More</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}