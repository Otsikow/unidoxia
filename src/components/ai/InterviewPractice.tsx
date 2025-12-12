import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Video,
  Mic,
  Play,
  Pause,
  Square,
  Download,
  RefreshCw,
  AlertCircle,
  Target,
  Volume2,
  VolumeX,
  BookOpen,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tips: string[];
  sampleAnswer?: string;
}

interface InterviewSession {
  id: string;
  questions: InterviewQuestion[];
  responses: {
    questionId: string;
    audioUrl?: string;
    videoBlob?: Blob;
    recordedAt?: string;
    transcript?: string;
    score?: number;
    feedback?: string;
  }[];
  overallScore?: number;
  completedAt?: Date;
}

export default function InterviewPractice() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('practice');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playbackUrlRef = useRef<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const questions: InterviewQuestion[] = [
    {
      id: '1',
      question: 'Tell me about yourself and why you want to study in this country.',
      category: 'personal',
      difficulty: 'easy',
      tips: [
        'Keep it concise (2-3 minutes)',
        'Focus on academic and professional background',
        'Mention specific reasons for choosing this country',
        'Show enthusiasm and passion'
      ],
      sampleAnswer: 'I am a recent graduate with a Bachelor\'s in Computer Science from [University]. I have always been passionate about technology and innovation, which led me to pursue advanced studies. I chose [Country] because of its world-class education system and cutting-edge research opportunities in my field.'
    },
    {
      id: '2',
      question: 'What are your career goals and how will this course help you achieve them?',
      category: 'academic',
      difficulty: 'medium',
      tips: [
        'Be specific about your short-term and long-term goals',
        'Connect your goals to the course curriculum',
        'Show research into the course and university',
        'Demonstrate clear career progression'
      ]
    },
    {
      id: '3',
      question: 'Why did you choose this specific university and course?',
      category: 'academic',
      difficulty: 'medium',
      tips: [
        'Research the university\'s strengths and reputation',
        'Mention specific faculty members or research areas',
        'Connect to your academic interests',
        'Show knowledge of course structure'
      ]
    },
    {
      id: '4',
      question: 'How do you plan to finance your studies?',
      category: 'financial',
      difficulty: 'easy',
      tips: [
        'Be honest about your financial situation',
        'Mention scholarships, savings, or family support',
        'Show awareness of living costs',
        'Demonstrate financial planning'
      ]
    },
    {
      id: '5',
      question: 'What challenges do you expect to face as an international student?',
      category: 'personal',
      difficulty: 'medium',
      tips: [
        'Acknowledge potential challenges honestly',
        'Show problem-solving mindset',
        'Mention support systems you\'ll use',
        'Demonstrate adaptability'
      ]
    },
    {
      id: '6',
      question: 'Describe a time when you had to work in a team with people from different cultural backgrounds.',
      category: 'behavioral',
      difficulty: 'hard',
      tips: [
        'Use the STAR method (Situation, Task, Action, Result)',
        'Show cultural sensitivity and adaptability',
        'Highlight communication skills',
        'Demonstrate leadership when appropriate'
      ]
    },
    {
      id: '7',
      question: 'What do you know about the culture and lifestyle in this country?',
      category: 'cultural',
      difficulty: 'easy',
      tips: [
        'Research cultural norms and values',
        'Mention specific aspects you\'re excited about',
        'Show respect for local customs',
        'Demonstrate cultural awareness'
      ]
    },
    {
      id: '8',
      question: 'How do you plan to contribute to the university community?',
      category: 'academic',
      difficulty: 'medium',
      tips: [
        'Mention specific clubs, organizations, or activities',
        'Show leadership potential',
        'Connect to your skills and interests',
        'Demonstrate community involvement'
      ]
    }
  ];

  const categories = ['all', 'personal', 'academic', 'financial', 'behavioral', 'cultural'];
  const difficulties = ['all', 'easy', 'medium', 'hard'];

  const filteredQuestions = questions.filter(q => {
    if (selectedCategory !== 'all' && q.category !== selectedCategory) return false;
    if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
    return true;
  });

  const currentQuestion = filteredQuestions[currentQuestionIndex] ?? null;

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const releasePlaybackUrl = () => {
    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current);
      playbackUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupStream();
      releasePlaybackUrl();
    };
  }, []);

  const getSupportedMimeType = () => {
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];

    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return undefined;
  };

  const startRecording = async () => {
    cleanupStream();
    releasePlaybackUrl();
    setRecordedBlob(null);

    try {
      const questionInProgress = filteredQuestions[currentQuestionIndex];
      if (!questionInProgress) {
        toast({
          title: 'No question selected',
          description: 'Select a question before recording.',
          variant: 'destructive'
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      streamRef.current = stream;
      setRecordedBlob(null);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.src = '';
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {
          // Autoplay might be blocked; user interaction already happened via button click.
        });
      }

      if (typeof MediaRecorder === 'undefined') {
        toast({
          title: 'Recording not supported',
          description: 'Your browser does not support video recording.',
          variant: 'destructive'
        });
        stream.getTracks().forEach(track => track.stop());
        setIsProcessing(false);
        return;
      }

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        cleanupStream();

        const blob = new Blob(chunks, {
          type: mimeType || 'video/webm'
        });
        releasePlaybackUrl();
        setRecordedBlob(blob);
        setIsProcessing(false);

        setCurrentSession(prev => {
          if (!prev) return prev;

          const updatedResponses = prev.responses.filter(response => response.questionId !== questionInProgress.id);

          return {
            ...prev,
            responses: [
              ...updatedResponses,
              {
                questionId: questionInProgress.id,
                videoBlob: blob,
                recordedAt: new Date().toISOString()
              }
            ]
          };
        });

        toast({
          title: 'Recording Complete',
          description: 'Your response has been recorded successfully'
        });
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setIsProcessing(true);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: 'Error',
        description: 'Could not access camera/microphone. Please check permissions.',
        variant: 'destructive'
      });
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (isRecording) {
      return;
    }

    if (!currentQuestion) {
      releasePlaybackUrl();
      setRecordedBlob(null);
      setIsPlaying(false);
      return;
    }

    const existingResponse = currentSession?.responses.find(
      (response) => response.questionId === currentQuestion.id && response.videoBlob
    );

    releasePlaybackUrl();

    if (existingResponse?.videoBlob) {
      setRecordedBlob(existingResponse.videoBlob);
      setIsPlaying(false);
    } else {
      setRecordedBlob(null);
      setIsPlaying(false);
    }
  }, [currentQuestion, currentSession, isRecording]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (!recordedBlob || !videoRef.current) return;

    releasePlaybackUrl();
    const url = URL.createObjectURL(recordedBlob);
    playbackUrlRef.current = url;

    videoRef.current.pause();
    videoRef.current.srcObject = null;
    videoRef.current.src = url;
    videoRef.current.muted = isMuted;
    videoRef.current.currentTime = 0;
    videoRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        setIsPlaying(false);
      });
  };

  const pauseRecording = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const retakeRecording = () => {
    releasePlaybackUrl();
    setRecordedBlob(null);
    setIsPlaying(false);

    setCurrentSession(prev => {
      if (!prev) return prev;
      if (!currentQuestion) return prev;
      return {
        ...prev,
        responses: prev.responses.filter(response => response.questionId !== currentQuestion.id)
      };
    });

    startRecording();
  };

  const downloadRecording = () => {
    if (!recordedBlob || !currentQuestion) return;
    const downloadUrl = URL.createObjectURL(recordedBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `interview-response-${currentQuestion.id}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    };

  const startNewSession = () => {
    const session: InterviewSession = {
      id: Date.now().toString(),
      questions: filteredQuestions,
      responses: []
    };
    setCurrentSession(session);
    setCurrentQuestionIndex(0);
    releasePlaybackUrl();
    setRecordedBlob(null);
    setIsPlaying(false);
  };

  const nextQuestion = () => {
    if (isRecording) {
      toast({
        title: 'Recording in progress',
        description: 'Stop the recording before moving to the next question.',
        variant: 'destructive'
      });
      return;
    }

    if (currentQuestion) {
      const hasRecording = currentSession?.responses.some(
        (response) => response.questionId === currentQuestion.id && response.videoBlob
      );

      if (!hasRecording) {
        toast({
          title: 'Record your response',
          description: 'Please record an answer before moving on.',
          variant: 'destructive'
        });
        return;
      }
    }

    if (currentQuestionIndex < filteredQuestions.length - 1) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      releasePlaybackUrl();
      setIsPlaying(false);
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (isRecording) {
      toast({
        title: 'Recording in progress',
        description: 'Stop the recording before navigating to another question.',
        variant: 'destructive'
      });
      return;
    }

    if (currentQuestionIndex > 0) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      releasePlaybackUrl();
      setIsPlaying(false);
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success-light text-success dark:bg-success/20';
      case 'medium': return 'bg-warning-light text-warning dark:bg-warning/20';
      case 'hard': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'personal': return 'bg-accent text-accent-foreground';
      case 'academic': return 'bg-primary/10 text-primary';
      case 'financial': return 'bg-success-light text-success dark:bg-success/20';
      case 'behavioral': return 'bg-warning-light text-warning dark:bg-warning/20';
      case 'cultural': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            Interview Practice
          </h2>
          <p className="text-muted-foreground">Practice for your university interview with AI-powered feedback</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="practice" className="gap-2">
            <Video className="h-4 w-4" />
            <span className="hidden xs:inline">Practice</span>
            <span className="hidden md:inline ml-1">Session</span>
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden xs:inline">Question</span>
            <span className="hidden md:inline ml-1">Bank</span>
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden xs:inline">Feedback</span>
            <span className="hidden md:inline ml-1">& Analysis</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="practice" className="space-y-6">
          {!currentSession ? (
            <Card>
              <CardHeader>
                <CardTitle>Start Your Interview Practice</CardTitle>
                <CardDescription>
                  Choose your preferences and start practicing with common interview questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Question Category</label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Difficulty Level</label>
                      <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {difficulties.map(difficulty => (
                            <SelectItem key={difficulty} value={difficulty}>
                              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-medium mb-2">Session Overview</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Questions:</span>
                          <span>{filteredQuestions.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Estimated time:</span>
                          <span>{filteredQuestions.length * 5} minutes</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Categories:</span>
                          <span>{new Set(filteredQuestions.map(q => q.category)).size}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button onClick={startNewSession} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Start Practice Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Progress */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Question {currentQuestionIndex + 1} of {filteredQuestions.length}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
                        {currentQuestion.difficulty}
                      </Badge>
                      <Badge className={getCategoryColor(currentQuestion.category)}>
                        {currentQuestion.category}
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={((currentQuestionIndex + 1) / filteredQuestions.length) * 100} 
                    className="h-2" 
                  />
                </CardContent>
              </Card>

              {/* Question */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Interview Question
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-lg">{currentQuestion.question}</p>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Tips for answering:</h4>
                    <ul className="space-y-1">
                      {currentQuestion.tips.map((tip, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {currentQuestion.sampleAnswer && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Sample Answer:</h4>
                      <p className="text-sm text-muted-foreground">{currentQuestion.sampleAnswer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recording Interface */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5" />
                    Record Your Response
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center">
                      <video
                        ref={videoRef}
                        className="w-full max-w-md rounded-lg"
                        autoPlay
                        playsInline
                        muted={isMuted}
                        controls={false}
                      />
                  </div>

                  <div className="flex items-center justify-center gap-4">
                      {!isRecording ? (
                        <Button onClick={startRecording} size="lg">
                          <Video className="h-5 w-5 mr-2" />
                          Start Recording
                        </Button>
                      ) : (
                        <Button onClick={stopRecording} size="lg" variant="destructive">
                          <Square className="h-5 w-5 mr-2" />
                          Stop Recording
                        </Button>
                      )}

                      {recordedBlob && !isRecording && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={isPlaying ? pauseRecording : playRecording}
                            disabled={isProcessing}
                          >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" onClick={() => setIsMuted(!isMuted)}>
                            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" onClick={downloadRecording}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" onClick={retakeRecording}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                  </div>

                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        onClick={previousQuestion}
                        disabled={currentQuestionIndex === 0 || isRecording}
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={nextQuestion}
                        disabled={currentQuestionIndex === filteredQuestions.length - 1 || isRecording}
                      >
                        Next Question
                      </Button>
                    </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interview Question Bank</CardTitle>
              <CardDescription>
                Browse and practice with common university interview questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questions.map((question) => (
                  <Card key={question.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <p className="text-lg font-medium">{question.question}</p>
                          <div className="flex items-center gap-2">
                            <Badge className={getDifficultyColor(question.difficulty)}>
                              {question.difficulty}
                            </Badge>
                            <Badge className={getCategoryColor(question.category)}>
                              {question.category}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Tips:</h4>
                          <ul className="space-y-1">
                            {question.tips.map((tip, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {question.sampleAnswer && (
                          <div className="p-3 bg-muted rounded-lg">
                            <h4 className="font-medium text-sm mb-2">Sample Answer:</h4>
                            <p className="text-sm text-muted-foreground">{question.sampleAnswer}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analysis</CardTitle>
                <CardDescription>
                  Review your interview performance and get personalized feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentSession && currentSession.responses.length > 0 ? (
                  <div className="space-y-6">
                    {currentSession.responses.map((response) => {
                      const question = questions.find((q) => q.id === response.questionId);
                      if (!response.videoBlob || !question) return null;

                      return (
                        <div key={response.questionId} className="space-y-3 p-4 border rounded-lg">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium">{question.question}</p>
                              <p className="text-xs text-muted-foreground">
                                Recorded on {response.recordedAt ? new Date(response.recordedAt).toLocaleString() : '—'}
                              </p>
                            </div>
                            <Badge className={getDifficultyColor(question.difficulty)}>
                              {question.difficulty}
                            </Badge>
                          </div>
                          <RecordedVideoPlayer blob={response.videoBlob} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No recordings yet</h3>
                    <p className="text-muted-foreground">
                      Complete a practice session to see your performance analysis
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecordedVideoPlayer({ blob }: { blob: Blob }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setVideoUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return (
    <video
      className="w-full rounded-lg"
      controls
      src={videoUrl ?? undefined}
    />
  );
}
