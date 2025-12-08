import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Zap, 
  Target, 
  FileText, 
  Video, 
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  TrendingUp,
  Lightbulb,
  Wand2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ProgramRecommendation {
  id: string;
  name: string;
  university: string;
  country: string;
  match_score: number;
  reasons: string[];
  tuition: number;
  currency: string;
  requirements: {
    ielts: number;
    gpa: number;
    work_experience: number;
  };
}

interface SoPData {
  student_name: string;
  program_name: string;
  university_name: string;
  motivation: string;
  career_goals: string;
  academic_background: string;
  work_experience: string;
  achievements: string;
}

interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sample_answer: string;
  evaluation_criteria: string[];
}

const INTERVIEW_CATEGORIES = [
  'Academic Background',
  'Career Goals',
  'Course Interest',
  'Cultural Adaptation',
  'Financial Planning',
  'Future Plans'
];

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

export default function AIFeatures() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('recommendations');
  const [recommendations, setRecommendations] = useState<ProgramRecommendation[]>([]);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [sopData, setSopData] = useState<SoPData>({
    student_name: '',
    program_name: '',
    university_name: '',
    motivation: '',
    career_goals: '',
    academic_background: '',
    work_experience: '',
    achievements: ''
  });
  const [generatedSoP, setGeneratedSoP] = useState('');
  const [isGeneratingSoP, setIsGeneratingSoP] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Academic Background');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');

  useEffect(() => {
    if (profile?.id) {
      generateProgramRecommendations();
    }
  }, [profile?.id]);

  const generateProgramRecommendations = async () => {
    setIsGeneratingRecommendations(true);
    try {
      // Simulate AI recommendation generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockRecommendations: ProgramRecommendation[] = [
        {
          id: '1',
          name: 'Master of Computer Science',
          university: 'University of Toronto',
          country: 'Canada',
          match_score: 95,
          reasons: [
            'Strong match with your academic background',
            'Excellent career prospects in tech',
            'Affordable tuition compared to US programs',
            'Post-graduation work permit available'
          ],
          tuition: 45000,
          currency: 'CAD',
          requirements: {
            ielts: 7.0,
            gpa: 3.5,
            work_experience: 2
          }
        },
        {
          id: '2',
          name: 'Master of Business Administration',
          university: 'University of British Columbia',
          country: 'Canada',
          match_score: 88,
          reasons: [
            'Good fit for your career goals',
            'Strong alumni network',
            'Beautiful campus location',
            'Co-op opportunities available'
          ],
          tuition: 52000,
          currency: 'CAD',
          requirements: {
            ielts: 7.5,
            gpa: 3.3,
            work_experience: 3
          }
        },
        {
          id: '3',
          name: 'Master of Data Science',
          university: 'University of Melbourne',
          country: 'Australia',
          match_score: 82,
          reasons: [
            'Growing field with high demand',
            'Good work-life balance',
            'Permanent residency pathway',
            'Strong industry connections'
          ],
          tuition: 38000,
          currency: 'AUD',
          requirements: {
            ielts: 6.5,
            gpa: 3.0,
            work_experience: 1
          }
        }
      ];

      setRecommendations(mockRecommendations);
      toast({
        title: 'Recommendations Generated',
        description: 'AI has analyzed your profile and found 3 suitable programs'
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate recommendations',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  const generateStatementOfPurpose = async () => {
    if (!sopData.student_name || !sopData.program_name || !sopData.university_name) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsGeneratingSoP(true);
    try {
      // Simulate AI SoP generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const generatedText = `Dear Admissions Committee,

I am writing to express my strong interest in the ${sopData.program_name} program at ${sopData.university_name}. As a dedicated student with a passion for ${sopData.academic_background}, I am excited about the opportunity to further my education and contribute to the academic community at your esteemed institution.

${sopData.motivation}

My academic journey has been marked by ${sopData.academic_background}, which has provided me with a solid foundation in the field. Through my studies, I have developed strong analytical and problem-solving skills that I believe will serve me well in your program.

${sopData.work_experience ? `In addition to my academic pursuits, I have gained valuable experience through ${sopData.work_experience}. This experience has reinforced my commitment to pursuing advanced studies and has given me practical insights that I hope to bring to the classroom.` : ''}

${sopData.achievements ? `Some of my notable achievements include ${sopData.achievements}. These accomplishments have not only strengthened my technical skills but have also taught me the importance of perseverance and collaboration.` : ''}

My career goals align perfectly with the objectives of your program. ${sopData.career_goals} I believe that the comprehensive curriculum and world-class faculty at ${sopData.university_name} will provide me with the knowledge and skills necessary to achieve these goals.

I am particularly drawn to your program because of its emphasis on practical application and research opportunities. The chance to work alongside renowned faculty members and collaborate with fellow students from diverse backgrounds is something I find very appealing.

I am confident that my academic background, professional experience, and passion for learning make me a strong candidate for your program. I look forward to the opportunity to contribute to and benefit from the vibrant academic community at ${sopData.university_name}.

Thank you for considering my application.

Sincerely,
${sopData.student_name}`;

      setGeneratedSoP(generatedText);
      toast({
        title: 'SoP Generated',
        description: 'Your Statement of Purpose has been generated successfully'
      });
    } catch (error) {
      console.error('Error generating SoP:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate Statement of Purpose',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingSoP(false);
    }
  };

  const generateInterviewQuestions = async () => {
    setIsGeneratingQuestions(true);
    try {
      // Simulate AI question generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockQuestions: InterviewQuestion[] = [
        {
          id: '1',
          question: 'Tell me about yourself and why you want to pursue this program.',
          category: 'Academic Background',
          difficulty: 'easy',
          sample_answer: 'I am a dedicated student with a passion for learning and a clear vision for my future career...',
          evaluation_criteria: ['Clarity of expression', 'Relevance to program', 'Personal motivation']
        },
        {
          id: '2',
          question: 'What specific skills do you hope to gain from this program?',
          category: 'Course Interest',
          difficulty: 'medium',
          sample_answer: 'I hope to develop advanced analytical skills, research methodology, and practical experience...',
          evaluation_criteria: ['Specificity', 'Alignment with program', 'Realistic expectations']
        },
        {
          id: '3',
          question: 'How do you plan to contribute to the university community?',
          category: 'Cultural Adaptation',
          difficulty: 'hard',
          sample_answer: 'I plan to actively participate in student organizations, share my cultural perspective...',
          evaluation_criteria: ['Community engagement', 'Cultural awareness', 'Leadership potential']
        }
      ];

      setInterviewQuestions(mockQuestions);
      toast({
        title: 'Questions Generated',
        description: 'AI has generated personalized interview questions for you'
      });
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate interview questions',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-warning';
    return 'text-destructive';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success-light text-success dark:bg-success/20';
      case 'medium': return 'bg-warning-light text-warning dark:bg-warning/20';
      case 'hard': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI-Powered Features</h2>
          <p className="text-muted-foreground">Leverage artificial intelligence to enhance your application process</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2">
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Course Matching
          </TabsTrigger>
          <TabsTrigger value="sop" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            SoP Generator
          </TabsTrigger>
          <TabsTrigger value="interview" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Interview Practice
          </TabsTrigger>
          <TabsTrigger value="instant" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Instant Submit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Course Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <p className="text-muted-foreground">
                  Get personalised course recommendations based on your profile
                </p>
                <Button 
                  onClick={generateProgramRecommendations}
                  disabled={isGeneratingRecommendations}
                >
                  {isGeneratingRecommendations ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Recommendations
                    </>
                  )}
                </Button>
              </div>

              {isGeneratingRecommendations && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Analyzing your profile...</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
              )}

              {recommendations.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.map((rec) => (
                    <Card key={rec.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl font-bold text-primary">
                                {rec.match_score}%
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{rec.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {rec.university} • {rec.country}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {rec.currency} {rec.tuition.toLocaleString()}
                              </Badge>
                            </div>

                            <div>
                              <h4 className="font-medium mb-2">Why this program matches:</h4>
                              <ul className="space-y-1">
                                {rec.reasons.map((reason, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm">
                                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                              <div>
                                <p className="text-sm text-muted-foreground">IELTS Required</p>
                                <p className="font-medium">{rec.requirements.ielts}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">GPA Required</p>
                                <p className="font-medium">{rec.requirements.gpa}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Work Experience</p>
                                <p className="font-medium">{rec.requirements.work_experience} years</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button size="sm">
                              <Star className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button variant="outline" size="sm">
                              Apply Now
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sop" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Statement of Purpose Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="student_name">Your Name *</Label>
                  <Input
                    id="student_name"
                    value={sopData.student_name}
                    onChange={(e) => setSopData({ ...sopData, student_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="program_name">Course Name *</Label>
                  <Input
                    id="program_name"
                    value={sopData.program_name}
                    onChange={(e) => setSopData({ ...sopData, program_name: e.target.value })}
                    placeholder="e.g., Master of Computer Science"
                  />
                </div>
                <div>
                  <Label htmlFor="university_name">University Name *</Label>
                  <Input
                    id="university_name"
                    value={sopData.university_name}
                    onChange={(e) => setSopData({ ...sopData, university_name: e.target.value })}
                    placeholder="e.g., University of Toronto"
                  />
                </div>
                <div>
                  <Label htmlFor="academic_background">Academic Background</Label>
                  <Input
                    id="academic_background"
                    value={sopData.academic_background}
                    onChange={(e) => setSopData({ ...sopData, academic_background: e.target.value })}
                    placeholder="e.g., Bachelor's in Computer Science"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="motivation">Motivation for Studying Abroad</Label>
                  <Textarea
                    id="motivation"
                    value={sopData.motivation}
                    onChange={(e) => setSopData({ ...sopData, motivation: e.target.value })}
                    placeholder="Why do you want to study abroad?"
                    className="min-h-[100px]"
                  />
                </div>
                <div>
                  <Label htmlFor="career_goals">Career Goals</Label>
                  <Textarea
                    id="career_goals"
                    value={sopData.career_goals}
                    onChange={(e) => setSopData({ ...sopData, career_goals: e.target.value })}
                    placeholder="What are your career aspirations?"
                    className="min-h-[100px]"
                  />
                </div>
                <div>
                  <Label htmlFor="work_experience">Work Experience</Label>
                  <Textarea
                    id="work_experience"
                    value={sopData.work_experience}
                    onChange={(e) => setSopData({ ...sopData, work_experience: e.target.value })}
                    placeholder="Describe your relevant work experience"
                    className="min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="achievements">Key Achievements</Label>
                  <Textarea
                    id="achievements"
                    value={sopData.achievements}
                    onChange={(e) => setSopData({ ...sopData, achievements: e.target.value })}
                    placeholder="List your notable achievements"
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              <Button 
                onClick={generateStatementOfPurpose}
                disabled={isGeneratingSoP}
                className="w-full"
              >
                {isGeneratingSoP ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating SoP...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Statement of Purpose
                  </>
                )}
              </Button>

              {generatedSoP && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Generated Statement of Purpose</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none dark:prose-invert">
                      <pre className="whitespace-pre-wrap text-sm">{generatedSoP}</pre>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                AI Interview Practice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Question Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVIEW_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Difficulty Level</Label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={generateInterviewQuestions}
                disabled={isGeneratingQuestions}
                className="w-full"
              >
                {isGeneratingQuestions ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Practice Questions
                  </>
                )}
              </Button>

              {interviewQuestions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Practice Questions</h3>
                  {interviewQuestions.map((question) => (
                    <Card key={question.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium mb-2">{question.question}</h4>
                              <div className="flex gap-2">
                                <Badge variant="outline">{question.category}</Badge>
                                <Badge className={getDifficultyColor(question.difficulty)}>
                                  {question.difficulty}
                                </Badge>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              <Video className="h-4 w-4 mr-2" />
                              Practice
                            </Button>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <h5 className="text-sm font-medium text-muted-foreground mb-1">
                                Sample Answer:
                              </h5>
                              <p className="text-sm bg-muted p-3 rounded">
                                {question.sample_answer}
                              </p>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-muted-foreground mb-1">
                                Evaluation Criteria:
                              </h5>
                              <ul className="text-sm space-y-1">
                                {question.evaluation_criteria.map((criteria, index) => (
                                  <li key={index} className="flex items-center gap-2">
                                    <CheckCircle className="h-3 w-3 text-success" />
                                    {criteria}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Instant Application Submission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8">
                <Zap className="h-16 w-16 mx-auto text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Instant Submission</h3>
                <p className="text-muted-foreground mb-6">
                  Submit your application instantly with AI-powered validation and processing
                </p>
                
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 mx-auto text-success mb-2" />
                    <h4 className="font-medium">Instant Validation</h4>
                    <p className="text-sm text-muted-foreground">
                      AI checks all requirements in real-time
                    </p>
                  </div>
                  <div className="text-center">
                    <Lightbulb className="h-8 w-8 mx-auto text-warning mb-2" />
                    <h4 className="font-medium">Smart Suggestions</h4>
                    <p className="text-sm text-muted-foreground">
                      Get recommendations to improve your application
                    </p>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 mx-auto text-info mb-2" />
                    <h4 className="font-medium">Higher Success Rate</h4>
                    <p className="text-sm text-muted-foreground">
                      AI-optimized applications have 40% better acceptance rates
                    </p>
                  </div>
                </div>

                <Button size="lg" className="w-full max-w-md">
                  <Zap className="h-5 w-5 mr-2" />
                  Start Instant Submission
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}